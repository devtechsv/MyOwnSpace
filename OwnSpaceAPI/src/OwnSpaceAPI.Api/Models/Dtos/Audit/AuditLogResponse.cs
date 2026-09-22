using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Audit;

public record AuditLogResponse(
    Guid Id,
    Guid ActorId,
    string ActorNombre,
    AuditAction Accion,
    AuditEntityType EntidadTipo,
    Guid EntidadId,
    string? Detalle,
    DateTime CreatedAt)
{
    public static AuditLogResponse FromEntity(AuditLog log) =>
        new(log.Id, log.ActorId, log.ActorNombre, log.Accion, log.EntidadTipo, log.EntidadId, log.Detalle, log.CreatedAt);
}
