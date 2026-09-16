using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Auth;

public interface IJwtTokenService
{
    // Emite un JWT con expiración fija de 2h desde ahora. La renovación
    // "deslizante" (SPEC.md §9) no vive acá: GET /auth/session llama a
    // este mismo método de nuevo con los mismos datos para reemitir un
    // token fresco, en vez de extender uno existente.
    string GenerateToken(Guid userId, string nombre, UserRole rol, UserStatus estado);
}
