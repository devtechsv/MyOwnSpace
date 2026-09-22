using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Pto;

public interface IPtoRequestsService
{
    Task<LeaveRequest> CrearAsync(Guid employeeId, DateOnly fecha, decimal horas);
    Task<List<LeaveRequest>> ListarEquipoAsync();
}