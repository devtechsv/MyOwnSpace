using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Requests;

public interface IRequestsService
{
    Task<List<LeaveRequest>> ListMineAsync(Guid employeeId);
    Task<List<LeaveRequest>> ListPendingAsync();
    Task<LeaveRequest> CreateAsync(Guid employeeId, RequestType tipo, DateOnly fechaInicio, DateOnly fechaFin, string motivo);
    Task<LeaveRequest> ApproveAsync(Guid id, Guid reviewerId);
    Task<LeaveRequest> DenyAsync(Guid id, Guid reviewerId);
}
