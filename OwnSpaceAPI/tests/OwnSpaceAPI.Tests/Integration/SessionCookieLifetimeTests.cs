using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Tests.Integration;

// El aviso de "sesión vencida por inactividad" del login depende de que el
// navegador siga enviando la cookie después de que el token venció: si
// vencieran juntos, el frontend vería "sin cookie" (nunca inició sesión) y
// el login no mostraría el aviso.
public class SessionCookieLifetimeTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string Password = "Contrasena#Valida1";
    private readonly CustomWebApplicationFactory _factory;

    public SessionCookieLifetimeTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient Cliente() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private async Task<User> SeedUserAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Test User",
            Correo = $"{Guid.NewGuid():N}@devtch.com",
            Rol = UserRole.Empleado,
            Estado = UserStatus.Activo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    [Fact]
    public async Task Login_LaCookieDuraMasQueElToken()
    {
        var user = await SeedUserAsync();

        var login = await Cliente().PostAsJsonAsync("/api/v1/auth/login", new { correo = user.Correo, password = Password });

        login.EnsureSuccessStatusCode();
        var cookie = login.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("accessToken="));
        var expires = cookie.Split(';').Select(p => p.Trim())
            .Single(p => p.StartsWith("expires=", StringComparison.OrdinalIgnoreCase))["expires=".Length..];
        var token = new JwtSecurityTokenHandler().ReadJwtToken(cookie.Split(';')[0].Split('=', 2)[1]);
        Assert.True(DateTimeOffset.Parse(expires) > DateTimeOffset.UtcNow.AddDays(29));
        Assert.True(token.ValidTo < DateTime.UtcNow.AddHours(3));
    }

    [Fact]
    public async Task Session_ConUnTokenVencido_Responde401()
    {
        var user = await SeedUserAsync();
        // Firmado con la clave de la app: lo único que lo invalida es que venció.
        var vencido = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: "OwnSpaceAPI.Tests",
            audience: "OwnSpaceAPI.Tests",
            claims: [new Claim(ClaimTypes.NameIdentifier, user.Id.ToString())],
            notBefore: DateTime.UtcNow.AddHours(-3),
            expires: DateTime.UtcNow.AddMinutes(-1),
            signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes("clave-de-pruebas-de-integracion-bien-larga-1234567890")),
                SecurityAlgorithms.HmacSha256)));
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/session");
        request.Headers.Add("Cookie", $"accessToken={vencido}");

        var response = await Cliente().SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
