using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Requests;

public interface IRequestsService
{
    Task<List<LeaveRequest>> ListMineAsync(Guid employeeId);
    Task<PagedResult<LeaveRequest>> ListPendingAsync(RequestType? tipo, DateOnly? fecha, string? nombre, int page, int pageSize);
    Task<PagedResult<LeaveRequest>> ListAllAsync(RequestStatus? estado, RequestType? tipo, DateOnly? fecha, string? nombre, int page, int pageSize);
    Task<LeaveRequest> CreateAsync(
        Guid employeeId, RequestType tipo, DateOnly fechaInicio, DateOnly fechaFin,
        TimeOnly? horaInicio, TimeOnly? horaFin, string motivo);
    Task<LeaveRequest> ApproveAsync(Guid id, Guid reviewerId);
    Task<LeaveRequest> DenyAsync(Guid id, Guid reviewerId, string motivo);
}
