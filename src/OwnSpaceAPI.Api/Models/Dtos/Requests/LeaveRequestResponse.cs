using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Requests;

public record LeaveRequestResponse(
    Guid Id,
    Guid EmployeeId,
    RequestType Tipo,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    string Motivo,
    RequestStatus Estado,
    DateTime CreatedAt,
    Guid? ReviewedBy,
    DateTime? ReviewedAt)
{
    public static LeaveRequestResponse FromEntity(LeaveRequest r) => new(
        r.Id, r.EmployeeId, r.Tipo, r.FechaInicio, r.FechaFin, r.Motivo, r.Estado, r.CreatedAt, r.ReviewedBy, r.ReviewedAt);
}
