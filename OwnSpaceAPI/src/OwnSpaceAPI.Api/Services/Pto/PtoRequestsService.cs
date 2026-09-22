using System.Data;
using Microsoft.Data.SqlClient;
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
    private const string MotivoAutoservicio = "Vacaciones — autoservicio (sin motivo)";

    private readonly AppDbContext _db;
    private readonly IPtoBalanceService _ptoBalanceService;
    private readonly IEmailSender _emailSender;

    public PtoRequestsService(AppDbContext db, IPtoBalanceService ptoBalanceService, IEmailSender emailSender)
    {
        _db = db;
        _ptoBalanceService = ptoBalanceService;
        _emailSender = emailSender;
    }

    public async Task<LeaveRequest> CrearAsync(Guid employeeId, DateOnly fecha, decimal horas)
    {
        if (horas <= 0 || horas > HorasMaximasPorDia)
        {
            throw new BadRequestException($"Las horas tienen que ser mayores a 0 y no pueden superar {HorasMaximasPorDia} (jornada completa).");
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
            var yaReservado = await _db.LeaveRequests.AnyAsync(r =>
                r.EmployeeId == employeeId
                && r.Tipo == RequestType.Vacaciones
                && r.Estado == RequestStatus.Aprobada
                && r.FechaInicio == fecha);
            if (yaReservado)
            {
                throw new ConflictException("Ya tenés PTO reservado para esa fecha.");
            }

            var balanceDisponible = await _ptoBalanceService.CalcularBalanceAsync(employeeId);
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
                Motivo = MotivoAutoservicio,
                Estado = RequestStatus.Aprobada,
                CreatedAt = DateTime.UtcNow,
                // Nadie revisó esto — nace ya Aprobada, no pasó por un admin.
                ReviewedBy = null,
                ReviewedAt = null,
            };

            _db.LeaveRequests.Add(request);
            await _db.SaveChangesAsync();
            if (transaction is not null)
            {
                await transaction.CommitAsync();
            }
        }
        catch (Exception ex) when (EsDeadlockOTimeoutDeLock(ex))
        {
            // 1205 (deadlock, elegida como víctima) y 1222 (timeout
            // esperando un lock) son el costo esperado de Serializable
            // bajo alta concurrencia (varias reservas del mismo empleado
            // a la vez) — se traducen a un 409 legible en vez de dejar
            // escapar el 500 crudo. EF Core envuelve el SqlException real
            // en un DbUpdateException (si pasó durante SaveChangesAsync)
            // y a veces en un InvalidOperationException encima — por eso
            // hay que recorrer InnerException en vez de un catch directo.
            throw new ConflictException("Hubo mucha actividad al mismo tiempo sobre tu PTO — intentá de nuevo.");
        }

        await _emailSender.SendAsync(
            employee.Correo,
            "Confirmación de PTO — MyOwnSpace",
            $"Reservaste {horas}h de PTO para el {fecha:dd/MM/yyyy}.");

        return request;
    }

    public async Task<List<LeaveRequest>> ListarEquipoAsync() =>
        await _db.LeaveRequests
            .Where(r => r.Tipo == RequestType.Vacaciones && r.Estado == RequestStatus.Aprobada)
            .OrderBy(r => r.FechaInicio)
            .ToListAsync();

    private static bool EsDeadlockOTimeoutDeLock(Exception ex)
    {
        for (var actual = ex; actual is not null; actual = actual.InnerException)
        {
            if (actual is SqlException sqlEx && sqlEx.Number is 1205 or 1222)
            {
                return true;
            }
        }

        return false;
    }
}