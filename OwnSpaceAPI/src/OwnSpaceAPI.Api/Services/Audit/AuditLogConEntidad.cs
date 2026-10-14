using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Audit;

// EntidadNombre es null si lo afectado ya no existe.
public sealed record AuditLogConEntidad(AuditLog Log, string? EntidadNombre);
