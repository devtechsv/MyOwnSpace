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

    public async Task<decimal> CalcularBalanceAsync(Guid employeeId)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == employeeId)
            ?? throw new NotFoundException($"Usuario {employeeId} no encontrado.");

        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var horasAcumuladas = PtoBalanceCalculator.CalcularHorasAcumuladas(user.FechaIngreso, user.FechaDesactivacion, hoy);

        var horasConsumidas = await _db.LeaveRequests
            .Where(r => r.EmployeeId == employeeId
                && r.Tipo == RequestType.Vacaciones
                && r.Estado == RequestStatus.Aprobada
                && r.FechaInicio.Year == hoy.Year)
            .SumAsync(r => r.HorasSolicitadas ?? 0);

        // Defensivo: en operación normal nunca debería dar negativo (una
        // solicitud se valida contra el balance al crearse, Fase 2), pero
        // el cálculo es independiente de esa validación — no debería
        // poder "mostrar" un balance negativo si algo cambió después
        // (ej. se desactivó al empleado tras ya haber consumido).
        return Math.Max(0, horasAcumuladas - horasConsumidas);
    }
}
