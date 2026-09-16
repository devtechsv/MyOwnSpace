using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Auth;

namespace OwnSpaceAPI.Tests.Auth;

public class JwtTokenServiceTests
{
    private static JwtTokenService CreateService()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Issuer"] = "OwnSpaceAPI.Tests",
                ["Jwt:Audience"] = "OwnSpaceAPI.Tests",
                ["Jwt:SigningKey"] = "clave-de-prueba-suficientemente-larga-1234567890",
            })
            .Build();

        return new JwtTokenService(config);
    }

    [Fact]
    public void GenerateToken_IncluyeLosClaimsNecesariosParaReconstruirLaSesion()
    {
        var service = CreateService();
        var userId = Guid.NewGuid();

        var tokenString = service.GenerateToken(userId, "Ana Martínez", UserRole.Empleado, UserStatus.Activo);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(tokenString);

        Assert.Equal(userId.ToString(), token.Claims.Single(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("Ana Martínez", token.Claims.Single(c => c.Type == OwnSpaceClaimTypes.Nombre).Value);
        Assert.Equal("Empleado", token.Claims.Single(c => c.Type == ClaimTypes.Role).Value);
        Assert.Equal("Activo", token.Claims.Single(c => c.Type == OwnSpaceClaimTypes.Estado).Value);
    }

    [Fact]
    public void GenerateToken_ExpiraEnAproximadamenteDosHoras()
    {
        var service = CreateService();
        var tokenString = service.GenerateToken(Guid.NewGuid(), "Julio Pérez", UserRole.Administrador, UserStatus.Activo);

        var token = new JwtSecurityTokenHandler().ReadJwtToken(tokenString);
        var restante = token.ValidTo - DateTime.UtcNow;

        Assert.InRange(restante.TotalMinutes, 115, 121);
    }
}
