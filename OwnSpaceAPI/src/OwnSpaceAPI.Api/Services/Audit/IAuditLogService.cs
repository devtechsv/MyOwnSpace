using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Audit;

public interface IAuditLogService
{
    // No hace SaveChangesAsync propio a propósito: agrega la entrada al
    // mismo ChangeTracker que la mutación real, y las dos se persisten
    // juntas en el SaveChangesAsync que ya hace el servicio que llama —
    // así la bitácora nunca queda desincronizada de la acción que
    // describe (se guardan las dos, o ninguna).
    Task RegistrarAsync(Guid actorId, AuditAction accion, AuditEntityType entidadTipo, Guid entidadId, string? detalle = null);

    Task<PagedResult<AuditLog>> ListarAsync(int page, int pageSize);
}
