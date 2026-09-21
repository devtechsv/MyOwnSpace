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

        var employee = await _db.Users.FirstOrDefaultAsync(u => u.Id == employeeId)
            ?? throw new NotFoundException($"Usuario {employeeId} no encontrado.");

        var request = new LeaveRequest
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
}