using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Audit;

namespace OwnSpaceAPI.Api.Models.Dtos.Audit;

public record AuditLogResponse(
    Guid Id,
    Guid? ActorId,
    string ActorNombre,
    AuditAction Accion,
    AuditEntityType EntidadTipo,
    Guid? EntidadId,
    string? Detalle,
    DateTime CreatedAt,
    // Nombre del usuario afectado o del empleado dueño de la solicitud;
    // null si ya no existe.
    string? EntidadNombre)
{
    public static AuditLogResponse FromEntity(AuditLogConEntidad entrada)
    {
        var log = entrada.Log;
        // SQL Server devuelve el DateTime sin Kind: sin esto se serializaría
        // sin la "Z" y el navegador lo leería como hora local, corrido 6 h.
        return new(log.Id, log.ActorId, log.ActorNombre, log.Accion, log.EntidadTipo, log.EntidadId, log.Detalle,
            DateTime.SpecifyKind(log.CreatedAt, DateTimeKind.Utc), entrada.EntidadNombre);
    }
}
