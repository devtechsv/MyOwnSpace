using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Tests.Integration;

// Límites de intentos de login, olvidé mi contraseña y cambio de contraseña
// (Program.cs, AddRateLimiter). Antes compartían un solo cupo de 10/min por
// IP: el cambio de contraseña de uno descontaba del login de los demás.
// Cada WithWebHostBuilder levanta una app nueva, con su propio estado de
// límites, así que estos tests no se afectan entre sí.
public class RateLimitTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public RateLimitTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private WebApplicationFactory<Program> ConLimites(int login = 30, int olvide = 10, int cambio = 5) =>
        _factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("RateLimit:LoginPerMinute", login.ToString());
            b.UseSetting("RateLimit:ForgotPasswordPerMinute", olvide.ToString());
            b.UseSetting("RateLimit:ChangePasswordPerMinute", cambio.ToString());
        });

    private static HttpClient Cliente(WebApplicationFactory<Program> factory) =>
        factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private static async Task<User> SeedUserAsync(WebApplicationFactory<Program> factory, string password)
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
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private static async Task<string> LoginAsync(HttpClient client, string correo, string password)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo, password });
        response.EnsureSuccessStatusCode();
        var setCookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("accessToken="));
        return setCookie.Split(';')[0].Split('=', 2)[1];
    }

    private static Task<HttpResponseMessage> CambiarPasswordAsync(HttpClient client, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/change-password")
        {
            Content = JsonContent.Create(new { passwordActual = "NoEsLaActual#2026", passwordNueva = "OtraValida#2026x" }),
        };
        request.Headers.Add("Cookie", $"accessToken={token}");
        return client.SendAsync(request);
    }

    private static Task<HttpResponseMessage> LoginFallidoAsync(HttpClient client) =>
        client.PostAsJsonAsync("/api/v1/auth/login", new { correo = "nadie@devtch.com", password = "Incorrecta#2026" });

    [Fact]
    public async Task Login_PorDefectoPermite30PorMinuto()
    {
        var client = Cliente(_factory.WithWebHostBuilder(_ => { }));

        for (var i = 0; i < 30; i++)
        {
            Assert.Equal(HttpStatusCode.Unauthorized, (await LoginFallidoAsync(client)).StatusCode);
        }

        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginFallidoAsync(client)).StatusCode);
    }

    [Fact]
    public async Task Login_AgotadoNoAfectaAOlvideMiContrasena()
    {
        var client = Cliente(ConLimites(login: 2));
        await LoginFallidoAsync(client);
        await LoginFallidoAsync(client);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await LoginFallidoAsync(client)).StatusCode);

        var olvide = await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { correo = "nadie@devtch.com" });

        Assert.Equal(HttpStatusCode.OK, olvide.StatusCode);
    }

    [Fact]
    public async Task OlvideMiContrasena_TieneSuPropioCupo()
    {
        var client = Cliente(ConLimites(olvide: 2));
        for (var i = 0; i < 2; i++)
        {
            await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { correo = "nadie@devtch.com" });
        }

        var tercero = await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { correo = "nadie@devtch.com" });

        Assert.Equal(HttpStatusCode.TooManyRequests, tercero.StatusCode);
        // El login sigue disponible.
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginFallidoAsync(client)).StatusCode);
    }

    [Fact]
    public async Task CambioDeContrasena_SeCuentaPorUsuarioYNoPorIp()
    {
        // Ana y Carlos salen por la misma IP, como dos compañeros de oficina.
        var factory = ConLimites(cambio: 2);
        var client = Cliente(factory);
        var ana = await SeedUserAsync(factory, "AnaValida#2026");
        var carlos = await SeedUserAsync(factory, "CarlosValido#2026");
        var tokenAna = await LoginAsync(client, ana.Correo, "AnaValida#2026");
        var tokenCarlos = await LoginAsync(client, carlos.Correo, "CarlosValido#2026");

        // Contraseña actual incorrecta: 401, pero cuenta como intento.
        Assert.Equal(HttpStatusCode.Unauthorized, (await CambiarPasswordAsync(client, tokenAna)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await CambiarPasswordAsync(client, tokenAna)).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await CambiarPasswordAsync(client, tokenAna)).StatusCode);

        // Carlos conserva su cupo aunque comparta la IP con Ana.
        Assert.Equal(HttpStatusCode.Unauthorized, (await CambiarPasswordAsync(client, tokenCarlos)).StatusCode);
    }

    [Theory]
    [InlineData("RateLimit:LoginPerMinute", "0")]
    [InlineData("RateLimit:ForgotPasswordPerMinute", "diez")]
    [InlineData("RateLimit:ChangePasswordPerMinute", "-1")]
    [InlineData("ForwardedHeaders:KnownProxies:0", "no-es-una-ip")]
    [InlineData("ForwardedHeaders:KnownNetworks:0", "10.0.0.0")]
    public void ConfiguracionInvalida_NoArrancaYNombraLaClave(string clave, string valor)
    {
        var ex = Assert.ThrowsAny<Exception>(
            () => _factory.WithWebHostBuilder(b => b.UseSetting(clave, valor)).CreateClient());

        // Sin el índice ":0": el mensaje nombra la sección.
        Assert.Contains(clave.Replace(":0", ""), ex.ToString());
    }

    [Fact]
    public void ProxiesYRedesValidas_Arrancan()
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("ForwardedHeaders:KnownProxies:0", "10.0.0.5");
            b.UseSetting("ForwardedHeaders:KnownNetworks:0", "10.0.0.0/24");
        }).CreateClient();

        Assert.NotNull(client);
    }
}
