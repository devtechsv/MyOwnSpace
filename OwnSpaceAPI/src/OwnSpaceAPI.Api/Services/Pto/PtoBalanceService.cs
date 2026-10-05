using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Pto;

public sealed class PtoBalanceService : IPtoBalanceService
{
    private readonly AppDbContext _db;

    public PtoBalanceService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<decimal> CalcularBalanceAsync(Guid employeeId, DateOnly? paraFecha = null)
    {
        var user = await ObtenerUsuarioAsync(employeeId);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        return await CalcularBalanceAsync(user, paraFecha ?? hoy, hoy);
    }

    public async Task<PtoBalanceResumen> ObtenerResumenAsync(Guid employeeId)
    {
        var user = await ObtenerUsuarioAsync(employeeId);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

        return new PtoBalanceResumen(
            await CalcularBalanceAsync(user, hoy, hoy),
            PtoBalanceCalculator.CalcularHorasEnAcumulacion(user.FechaIngreso, user.FechaDesactivacion, hoy),
            PtoBalanceCalculator.FinPeriodoExclusivo(user.FechaIngreso, hoy));
    }

    private async Task<User> ObtenerUsuarioAsync(Guid employeeId) =>
        await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == employeeId)
            ?? throw new NotFoundException($"Usuario {employeeId} no encontrado.");

    private async Task<decimal> CalcularBalanceAsync(User user, DateOnly fecha, DateOnly hoy)
    {
        var horasDisponibles = PtoBalanceCalculator.CalcularHorasDisponibles(
            user.FechaIngreso, user.FechaDesactivacion, fecha, hoy);

        // Solo descuenta lo reservado dentro del mismo periodo por
        // aniversario — lo de periodos anteriores ya no cuenta.
        var inicio = PtoBalanceCalculator.InicioPeriodo(user.FechaIngreso, fecha);
        var finExclusivo = PtoBalanceCalculator.FinPeriodoExclusivo(user.FechaIngreso, fecha);
        var horasConsumidas = await _db.LeaveRequests
            .Where(r => r.EmployeeId == user.Id
                && r.Tipo == RequestType.Vacaciones
                && r.Estado == RequestStatus.Aprobada
                && r.FechaInicio >= inicio
                && r.FechaInicio < finExclusivo)
            .SumAsync(r => r.HorasSolicitadas ?? 0);

        // Defensivo: en operación normal nunca debería dar negativo (una
        // solicitud se valida contra el balance al crearse, Fase 2), pero
        // el cálculo es independiente de esa validación — no debería
        // poder "mostrar" un balance negativo si algo cambió después
        // (ej. se desactivó al empleado tras ya haber consumido).
        return Math.Max(0, horasDisponibles - horasConsumidas);
    }
}
