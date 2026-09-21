using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Tests.Integration;

// Primeros tests que ejercitan el pipeline HTTP real (no solo la capa de
// servicio): prueban que OnTokenValidated (Program.cs) realmente rechaza
// un token con securityStamp desactualizado, y que
// NotFoundOnForbidResultHandler realmente devuelve 404 en un request HTTP
// de verdad — ninguno de los dos tenía cobertura hasta ahora.
public class AuthorizationAndRevocationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public AuthorizationAndRevocationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private async Task<User> SeedUserAsync(
        UserRole rol, string password, UserStatus estado = UserStatus.Activo, bool mustChangePassword = false)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = new PasswordHasher<User>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Test User",
            Correo = $"{Guid.NewGuid():N}@devtch.com",
            Rol = rol,
            Estado = estado,
            MustChangePassword = mustChangePassword,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = hasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private async Task SetEstadoAsync(Guid userId, UserStatus estado)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.FindAsync(userId);
        user!.Estado = estado;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync();
    }

    private static async Task<string> LoginAndGetTokenAsync(HttpClient client, string correo, string password)
    {
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo, password });
        response.EnsureSuccessStatusCode();

        var setCookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("accessToken="));
        return setCookie.Split(';')[0].Split('=', 2)[1];
    }

    private static Task<HttpResponseMessage> SendWithTokenAsync(HttpClient client, HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("Cookie", $"accessToken={token}");
        return client.SendAsync(request);
    }

    [Fact]
    public async Task ProtectedEndpoint_SinCookie_Devuelve401NoNotFound()
    {
        var client = CreateClient();

        var response = await client.GetAsync("/api/v1/auth/session");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_ConCredencialesValidas_PermiteLlamarEndpointsProtegidos()
    {
        var user = await SeedUserAsync(UserRole.Empleado, "Empleado123!");
        var client = CreateClient();

        var token = await LoginAndGetTokenAsync(client, user.Correo, "Empleado123!");
        var response = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/auth/session", token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Desactivar_InvalidaInmediatamenteUnTokenYaEmitido()
    {
        var user = await SeedUserAsync(UserRole.Empleado, "Empleado123!");
        var client = CreateClient();
        var token = await LoginAndGetTokenAsync(client, user.Correo, "Empleado123!");
        Assert.Equal(HttpStatusCode.OK, (await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/auth/session", token)).StatusCode);

        await SetEstadoAsync(user.Id, UserStatus.Desactivado);

        var response = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/auth/session", token);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Empleado_NoPuedeLlamarEndpointDeAdministrador_Devuelve404()
    {
        var user = await SeedUserAsync(UserRole.Empleado, "Empleado123!");
        var client = CreateClient();
        var token = await LoginAndGetTokenAsync(client, user.Correo, "Empleado123!");

        var response = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/users", token);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Administrador_SiPuedeLlamarEndpointDeAdministrador()
    {
        var user = await SeedUserAsync(UserRole.Administrador, "Admin123456!");
        var client = CreateClient();
        var token = await LoginAndGetTokenAsync(client, user.Correo, "Admin123456!");

        var response = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/users", token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task MustChangePassword_BloqueaElRestoDeLaApiHastaCambiarLaContrasenaYAhiSeDestraba()
    {
        var user = await SeedUserAsync(UserRole.Empleado, "Temporal123!", mustChangePassword: true);
        var client = CreateClient();
        var token = await LoginAndGetTokenAsync(client, user.Correo, "Temporal123!");

        // Un endpoint de negocio cualquiera (no está en la lista blanca
        // del middleware) tiene que dar 403 mientras no cambie la
        // contraseña temporal.
        var bloqueado = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/requests/mine", token);
        Assert.Equal(HttpStatusCode.Forbidden, bloqueado.StatusCode);

        // Pero /auth/session sí sigue permitido (está en la lista blanca).
        var sesion = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/auth/session", token);
        Assert.Equal(HttpStatusCode.OK, sesion.StatusCode);

        // Cambiar la contraseña (también en la lista blanca) saca el bloqueo.
        var cambioRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/change-password");
        cambioRequest.Headers.Add("Cookie", $"accessToken={token}");
        cambioRequest.Content = JsonContent.Create(new
        {
            passwordActual = "Temporal123!",
            passwordNueva = "MiPropiaElegida456!",
        });
        var cambioResponse = await client.SendAsync(cambioRequest);
        Assert.Equal(HttpStatusCode.NoContent, cambioResponse.StatusCode);

        var nuevoToken = cambioResponse.Headers.GetValues("Set-Cookie")
            .Single(c => c.StartsWith("accessToken="))
            .Split(';')[0].Split('=', 2)[1];

        var yaPermitido = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/requests/mine", nuevoToken);
        Assert.Equal(HttpStatusCode.OK, yaPermitido.StatusCode);
    }

    [Fact]
    public async Task Logout_InvalidaElTokenDeInmediatoAunqueAlguienLoHayaCapturadoAntes()
    {
        var user = await SeedUserAsync(UserRole.Empleado, "Empleado123!");
        var client = CreateClient();
        var token = await LoginAndGetTokenAsync(client, user.Correo, "Empleado123!");
        Assert.Equal(HttpStatusCode.OK, (await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/auth/session", token)).StatusCode);

        await SendWithTokenAsync(client, HttpMethod.Post, "/api/v1/auth/logout", token);

        // Reenviamos a mano el token viejo (simula que alguien lo capturó
        // antes del logout) — antes de este fix seguía siendo válido por
        // las 2h restantes.
        var response = await SendWithTokenAsync(client, HttpMethod.Get, "/api/v1/auth/session", token);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}