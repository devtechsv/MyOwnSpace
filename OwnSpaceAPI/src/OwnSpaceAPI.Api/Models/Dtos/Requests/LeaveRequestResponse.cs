using System.Text.Json.Serialization;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Requests;

public record LeaveRequestResponse(
    Guid Id,
    Guid EmployeeId,
    // Nullable a propósito: CreateAsync no carga el User completo del
    // empleado (solo tiene el EmployeeId) — ahí queda null. La vista de
    // admin (que sí necesita el nombre) siempre lo carga vía .Include(),
    // ver RequestsService.ListMineAsync/ListPendingAsync/ListAllAsync.
    string? EmployeeNombre,
    [property: JsonConverter(typeof(RequestTypeJsonConverter))] RequestType Tipo,
    DateOnly FechaInicio,
    DateOnly FechaFin,
    [property: JsonConverter(typeof(TimeOnlyJsonConverter))] TimeOnly? HoraInicio,
    [property: JsonConverter(typeof(TimeOnlyJsonConverter))] TimeOnly? HoraFin,
    string Motivo,
    RequestStatus Estado,
    DateTime CreatedAt,
    Guid? ReviewedBy,
    DateTime? ReviewedAt,
    string? MotivoRechazo)
{
    public static LeaveRequestResponse FromEntity(LeaveRequest r) => new(
        r.Id, r.EmployeeId, r.Employee?.Nombre, r.Tipo, r.FechaInicio, r.FechaFin, r.HoraInicio, r.HoraFin, r.Motivo, r.Estado, r.CreatedAt, r.ReviewedBy, r.ReviewedAt, r.MotivoRechazo);
}
