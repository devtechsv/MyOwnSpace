using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Tests.Integration;

// Auth:CookieDomain permite frontend y API en subdominios distintos
// (app.dominio.com / api.dominio.com): la cookie tiene que llevar Domain
// al crearse, al renovarse y al borrarse — si el borrado no lo lleva, el
// logout apunta a otra cookie y la sesión sigue viva.
public class CookieDomainTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string Password = "Contrasena#Valida1";
    private readonly CustomWebApplicationFactory _factory;

    public CookieDomainTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private WebApplicationFactory<Program> ConDominio(string? dominio) =>
        _factory.WithWebHostBuilder(b => b.UseSetting("Auth:CookieDomain", dominio));

    private static async Task<string> SeedUserAsync(WebApplicationFactory<Program> factory)
    {
        using var scope = factory.Services.CreateScope();
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
        return user.Correo;
    }

    private static string CookieDeSesion(HttpResponseMessage response) =>
        response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("accessToken="));

    private static async Task<(HttpResponseMessage Login, HttpResponseMessage Session, HttpResponseMessage Logout)>
        LoginSessionLogoutAsync(WebApplicationFactory<Program> factory)
    {
        var correo = await SeedUserAsync(factory);
        var client = factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo, password = Password });
        login.EnsureSuccessStatusCode();
        var token = CookieDeSesion(login).Split(';')[0].Split('=', 2)[1];

        var sessionRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/session");
        sessionRequest.Headers.Add("Cookie", $"accessToken={token}");
        var session = await client.SendAsync(sessionRequest);
        session.EnsureSuccessStatusCode();

        var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/logout");
        logoutRequest.Headers.Add("Cookie", $"accessToken={token}");
        var logout = await client.SendAsync(logoutRequest);
        logout.EnsureSuccessStatusCode();

        return (login, session, logout);
    }

    [Fact]
    public async Task ConCookieDomain_LoginRenovacionYLogoutLlevanEseDominio()
    {
        var (login, session, logout) = await LoginSessionLogoutAsync(ConDominio("dominio.com"));

        Assert.Contains("domain=dominio.com", CookieDeSesion(login), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("domain=dominio.com", CookieDeSesion(session), StringComparison.OrdinalIgnoreCase);
        Assert.Contains("domain=dominio.com", CookieDeSesion(logout), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SinCookieDomain_LaCookieSigueSiendoSoloDelHost()
    {
        var (login, session, logout) = await LoginSessionLogoutAsync(_factory);

        Assert.DoesNotContain("domain=", CookieDeSesion(login), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain=", CookieDeSesion(session), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain=", CookieDeSesion(logout), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("https://dominio.com")]
    [InlineData("dominio.com:443")]
    [InlineData("dominio.com/app")]
    public void CookieDomainConEsquemaPuertoORuta_NoDejaArrancarLaApi(string dominio)
    {
        // Mejor fallar al arrancar que una cookie que el navegador descarta
        // en silencio (nadie podría iniciar sesión y no habría ningún error).
        var ex = Assert.ThrowsAny<Exception>(() => ConDominio(dominio).CreateClient());

        Assert.Contains("Auth:CookieDomain", ex.ToString());
    }
}
