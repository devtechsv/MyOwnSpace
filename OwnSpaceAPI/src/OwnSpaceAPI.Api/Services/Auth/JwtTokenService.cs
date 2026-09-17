using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using OwnSpaceAPI.Api.Models.Entities;
using System.IdentityModel.Tokens.Jwt;

namespace OwnSpaceAPI.Api.Services.Auth;

// Nombres de los claims custom (no hay uno estándar para "nombre" ni para
// el estado del usuario) — compartidos con AuthController, que los lee de
// vuelta en GET /auth/session sin consultar la base (SPEC.md §9).
public static class OwnSpaceClaimTypes
{
    public const string Nombre = "nombre";
    public const string Estado = "estado";
}

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(Guid userId, string nombre, UserRole rol, UserStatus estado)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(OwnSpaceClaimTypes.Nombre, nombre),
            new(ClaimTypes.Role, rol.ToString()),
            new(OwnSpaceClaimTypes.Estado, estado.ToString()),
        };

        var signingKey = _config["Jwt:SigningKey"]
            ?? throw new InvalidOperationException("Falta configurar Jwt:SigningKey.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
