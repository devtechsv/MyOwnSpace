using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Tests.Integration;

// Regresión del ataque reproducido en vivo (2026-10-06): un
// forgot-password anónimo, con solo conocer el correo, cerraba la sesión
// activa de la víctima y le invalidaba la contraseña. Clase aparte (con su
// propia fábrica) para no compartir el contador del rate limiter "auth"
// con AuthorizationAndRevocationTests.
public class ForgotPasswordLockoutTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public ForgotPasswordLockoutTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task ForgotPasswordAnonimo_NoCierraLaSesionNiInvalidaLaContrasena()
    {
        const string password = "DeSiempre#2026";
        string correo;
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = new User
            {
                Id = Guid.NewGuid(),
                Nombre = "Víctima",
                Correo = $"{Guid.NewGuid():N}@devtch.com",
                Rol = UserRole.Empleado,
                Estado = UserStatus.Activo,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
            db.Users.Add(user);
            await db.SaveChangesAsync();
            correo = user.Correo;
        }

        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo, password });
        login.EnsureSuccessStatusCode();
        var token = login.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("accessToken="))
            .Split(';')[0].Split('=', 2)[1];

        // El "atacante": sin cookie, solo con el correo.
        var forgot = await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { correo });
        Assert.Equal(HttpStatusCode.OK, forgot.StatusCode);

        var session = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/session");
        session.Headers.Add("Cookie", $"accessToken={token}");
        Assert.Equal(HttpStatusCode.OK, (await client.SendAsync(session)).StatusCode);

        var loginOtraVez = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo, password });
        Assert.Equal(HttpStatusCode.OK, loginOtraVez.StatusCode);
    }
}
