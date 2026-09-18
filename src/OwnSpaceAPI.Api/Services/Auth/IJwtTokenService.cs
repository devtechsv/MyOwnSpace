using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Auth;

public interface IJwtTokenService
{
    // Emite un JWT con expiración fija de 2h desde ahora. La renovación
    // "deslizante" vive en GET /auth/session, que vuelve a consultar la
    // base (no confía en los claims del token viejo) y reemite con este
    // mismo método. El securityStamp viaja como claim y se valida en
    // cada request (Program.cs, OnTokenValidated) — cambiarlo revoca
    // todas las sesiones existentes de ese usuario.
    string GenerateToken(Guid userId, string nombre, UserRole rol, UserStatus estado, string securityStamp);
}