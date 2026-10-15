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

    // Inicio de sesión fallido. A diferencia de RegistrarAsync, guarda por su
    // cuenta: no hay ninguna mutación con la que compartir el commit. Sin actor
    // (quien lo intentó puede no ser el dueño de la cuenta); usuarioId es null
    // si el correo no está registrado. Nunca recibe el texto escrito como
    // correo: podría ser una contraseña tecleada en el campo equivocado.
    Task RegistrarInicioSesionFallidoAsync(Guid? usuarioId, string motivo);

    // desde/hasta son días en hora de El Salvador, ambos incluidos.
    Task<PagedResult<AuditLogConEntidad>> ListarAsync(
        AuditAction? accion, DateOnly? desde, DateOnly? hasta, int page, int pageSize);
}
