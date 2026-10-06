using System.Data;
using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Pto;

public sealed class PtoRequestsService : IPtoRequestsService
{
    private const decimal HorasMaximasPorDia = 8m;
    // Vacaciones vía este flujo no pide Motivo (decisión confirmada con
    // el usuario) — el campo sigue siendo required a nivel de entidad
    // porque lo comparten los otros 4 tipos, así que se completa con un
    // texto fijo en vez de hacerlo nullable para todo el modelo.
    private const string MotivoUnDia = "Vacaciones — solicitud de un día";
    private const string MotivoRango = "Vacaciones — solicitud por rango";

    private readonly AppDbContext _db;
    private readonly IPtoBalanceService _ptoBalanceService;
    private readonly IEmailSender _emailSender;
    private readonly TimeProvider _clock;

    public PtoRequestsService(AppDbContext db, IPtoBalanceService ptoBalanceService, IEmailSender emailSender, TimeProvider clock)
    {
        _db = db;
        _ptoBalanceService = ptoBalanceService;
        _emailSender = emailSender;
        _clock = clock;
    }

    // Hora de El Salvador, no UTC (ver FechaLocal).
    private DateOnly Hoy => _clock.HoyLocal();

    public async Task<LeaveRequest> CrearAsync(Guid employeeId, DateOnly fecha, decimal horas)
    {
        if (horas <= 0 || horas > HorasMaximasPorDia)
        {
            throw new BadRequestException($"Las horas tienen que ser mayores a 0 y no pueden superar {HorasMaximasPorDia} (jornada completa).");
        }
        // Mismas reglas de fecha que SolicitarRangoAsync: el calendario ya
        // las bloquea, pero el API no puede depender de eso.
        if (fecha < Hoy)
        {
            throw new BadRequestException("No puedes solicitar vacaciones en fechas pasadas.");
        }
        if (!PtoBalanceCalculator.EsDiaHabil(fecha))
        {
            throw new BadRequestException("Las vacaciones no pueden ser en sábado ni domingo.");
        }

        // Serializable: el chequeo de balance (una SUM sobre
        // LeaveRequests, en PtoBalanceService) y la inserción tienen que
        // verse como una sola operación atómica — sin esto, dos requests
        // concurrentes del mismo empleado (doble click, o un script)
        // podrían leer el mismo balance "disponible" antes de que
        // ninguna haga commit, y las dos pasar la validación (el balance
        // real quedaría negativo). SQL Server serializa/bloquea la
        // segunda transacción hasta que la primera termine.
        // IsRelational(): el proveedor InMemory (tests) no soporta
        // transacciones — BeginTransactionAsync tira bajo ese proveedor,
        // así que se salta ahí (los tests no ejercitan concurrencia real
        // de todos modos).
        using var transaction = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable)
            : null;

        LeaveRequest request;
        User employee;
        try
        {
            if (await HayVacacionesEnAsync(employeeId, fecha, fecha))
            {
                throw new ConflictException("Ya tienes PTO reservado para esa fecha.");
            }

            var balanceDisponible = await _ptoBalanceService.CalcularDisponibleAsync(employeeId);
            if (horas > balanceDisponible)
            {
                throw new ConflictException("No tienes balance de PTO suficiente para esa cantidad de horas.");
            }

            employee = await _db.Users.FirstOrDefaultAsync(u => u.Id == employeeId)
                ?? throw new NotFoundException($"Usuario {employeeId} no encontrado.");

            request = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                EmployeeId = employeeId,
                Tipo = RequestType.Vacaciones,
                FechaInicio = fecha,
                FechaFin = fecha,
                HorasSolicitadas = horas,
                Motivo = MotivoUnDia,
                // Igual que el rango: queda Pendiente hasta que un admin la
                // apruebe (RequestsService.ReviewAsync vuelve a validar el
                // saldo). Mientras tanto aparta sus horas del disponible.
                Estado = RequestStatus.Pendiente,
                CreatedAt = DateTime.UtcNow,
            };

            _db.LeaveRequests.Add(request);
            await _db.SaveChangesAsync();
            if (transaction is not null)
            {
                await transaction.CommitAsync();
            }
        }
        catch (Exception ex) when (SqlConcurrencia.EsDeadlockOTimeoutDeLock(ex))
        {
            throw new ConflictException("Hubo mucha actividad al mismo tiempo sobre tu PTO — inténtalo de nuevo.");
        }

        await _emailSender.SendAsync(
            employee.Correo,
            "Solicitud de PTO recibida — MyOwnSpace",
            $"Solicitaste {horas}h de PTO para el {fecha:dd/MM/yyyy}. Queda pendiente de aprobación; " +
            "te avisaremos por correo cuando un administrador la revise.");

        return request;
    }

    public async Task<LeaveRequest> SolicitarRangoAsync(Guid employeeId, DateOnly fechaInicio, DateOnly fechaFin, string? motivo)
    {
        if (fechaFin < fechaInicio)
        {
            throw new BadRequestException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }
        if (fechaInicio < Hoy)
        {
            throw new BadRequestException("No puedes solicitar vacaciones en fechas pasadas.");
        }
        // Art. 178: las vacaciones no pueden iniciarse en día de descanso.
        if (!PtoBalanceCalculator.EsDiaHabil(fechaInicio))
        {
            throw new BadRequestException("Las vacaciones no pueden iniciar en sábado ni domingo.");
        }
        // Tope de cordura: evita recorrer rangos absurdos día por día.
        if (fechaFin > fechaInicio.AddYears(1))
        {
            throw new BadRequestException("El rango de vacaciones no puede superar un año.");
        }

        var horas = PtoBalanceCalculator.ContarDiasHabiles(fechaInicio, fechaFin) * PtoBalanceCalculator.HorasPorDia;

        // Mismo criterio Serializable que CrearAsync: el chequeo de saldo y
        // la inserción tienen que ser atómicos.
        using var transaction = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable)
            : null;

        LeaveRequest request;
        try
        {
            if (await HayVacacionesEnAsync(employeeId, fechaInicio, fechaFin))
            {
                throw new ConflictException("Ya tienes vacaciones solicitadas o reservadas en esas fechas.");
            }

            var disponible = await _ptoBalanceService.CalcularDisponibleAsync(employeeId);
            if (horas > disponible)
            {
                throw new ConflictException($"No tienes horas suficientes: necesitas {horas:0.##}h y tienes {disponible:0.##}h disponibles.");
            }

            request = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                EmployeeId = employeeId,
                Tipo = RequestType.Vacaciones,
                FechaInicio = fechaInicio,
                FechaFin = fechaFin,
                HorasSolicitadas = horas,
                Motivo = string.IsNullOrWhiteSpace(motivo) ? MotivoRango : motivo.Trim(),
                Estado = RequestStatus.Pendiente,
                CreatedAt = DateTime.UtcNow,
            };

            _db.LeaveRequests.Add(request);
            await _db.SaveChangesAsync();
            if (transaction is not null)
            {
                await transaction.CommitAsync();
            }
        }
        catch (Exception ex) when (SqlConcurrencia.EsDeadlockOTimeoutDeLock(ex))
        {
            throw new ConflictException("Hubo mucha actividad al mismo tiempo sobre tu PTO — inténtalo de nuevo.");
        }

        return request;
    }

    // Cualquier vacación aprobada o pendiente del empleado que se cruce con
    // [desde, hasta] — cubre tanto reservas de un día como rangos.
    private Task<bool> HayVacacionesEnAsync(Guid employeeId, DateOnly desde, DateOnly hasta) =>
        _db.LeaveRequests.AnyAsync(r =>
            r.EmployeeId == employeeId
            && r.Tipo == RequestType.Vacaciones
            && (r.Estado == RequestStatus.Aprobada || r.Estado == RequestStatus.Pendiente)
            && r.FechaInicio <= hasta
            && r.FechaFin >= desde);

    public async Task<List<LeaveRequest>> ListarEquipoAsync(DateOnly? mes = null)
    {
        // Include: el nombre del empleado viaja en la respuesta
        // (EmployeeNombre) — sin esto el frontend tenía que descargar a
        // todos los usuarios, admins incluidos, solo para resolver nombres.
        var query = _db.LeaveRequests
            .Include(r => r.Employee)
            .Where(r => r.Tipo == RequestType.Vacaciones && r.Estado == RequestStatus.Aprobada);

        if (mes is { } inicioMes)
        {
            // Un rango aparece en todos los meses que toca, no solo en el de inicio.
            var finMes = inicioMes.AddMonths(1).AddDays(-1);
            query = query.Where(r => r.FechaInicio <= finMes && r.FechaFin >= inicioMes);
        }

        return await query.OrderBy(r => r.FechaInicio).ToListAsync();
    }
}