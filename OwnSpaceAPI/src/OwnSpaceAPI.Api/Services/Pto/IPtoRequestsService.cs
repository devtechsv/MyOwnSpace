using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Pto;

public interface IPtoRequestsService
{
    // Vacaciones de un día (hasta 8h): día hábil, no pasado; queda Pendiente de un admin.
    Task<LeaveRequest> CrearAsync(Guid employeeId, DateOnly fecha, decimal horas);
    // Vacaciones por rango: días hábiles × 8h, queda Pendiente de un admin.
    Task<LeaveRequest> SolicitarRangoAsync(Guid employeeId, DateOnly fechaInicio, DateOnly fechaFin, string? motivo);
    Task<List<LeaveRequest>> ListarEquipoAsync();
}