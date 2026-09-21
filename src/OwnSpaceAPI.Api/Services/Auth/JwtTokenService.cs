using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using OwnSpaceAPI.Api.Models.Entities;
using System.IdentityModel.Tokens.Jwt;

namespace OwnSpaceAPI.Api.Services.Auth;

public static class OwnSpaceClaimTypes
{
    public const string Nombre = "nombre";
    public const string Estado = "estado";
    public const string SecurityStamp = "security_stamp";
    public const string MustChangePassword = "must_change_password";
}

public sealed class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(Guid userId, string nombre, UserRole rol, UserStatus estado, string securityStamp, bool mustChangePassword)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(OwnSpaceClaimTypes.Nombre, nombre),
            new(ClaimTypes.Role, rol.ToString()),
            new(OwnSpaceClaimTypes.Estado, estado.ToString()),
            new(OwnSpaceClaimTypes.SecurityStamp, securityStamp),
            new(OwnSpaceClaimTypes.MustChangePassword, mustChangePassword.ToString()),
        };

        var signingKey = _config["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
        {
            throw new InvalidOperationException("Jwt:SigningKey debe estar configurado con al menos 32 bytes (256 bits).");
        }

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