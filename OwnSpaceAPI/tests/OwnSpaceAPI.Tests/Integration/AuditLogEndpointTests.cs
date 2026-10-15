using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Tests.Integration;

// GET /api/v1/audit-logs a través del pipeline real: rol, filtros por query
// string y forma de la respuesta.
public class AuditLogEndpointTests : IClassFixture<CustomWebApplicationFactory>
{
    private const string Password = "Contrasena#Valida1";
    private readonly CustomWebApplicationFactory _factory;

    public AuditLogEndpointTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<User> SeedUserAsync(UserRole rol, string nombre = "Test User")
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = nombre,
            Correo = $"{Guid.NewGuid():N}@devtch.com",
            Rol = rol,
            Estado = UserStatus.Activo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = new PasswordHasher<User>().HashPassword(user, Password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    private async Task SeedEntradaAsync(Guid actorId, AuditAction accion, Guid entidadId)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorId = actorId,
            ActorNombre = "Julio Pérez",
            Accion = accion,
            EntidadTipo = AuditEntityType.Usuario,
            EntidadId = entidadId,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private async Task<HttpResponseMessage> GetComoAsync(User user, string url)
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo = user.Correo, password = Password });
        login.EnsureSuccessStatusCode();
        var token = login.Headers.GetValues("Set-Cookie")
            .Single(c => c.StartsWith("accessToken=")).Split(';')[0].Split('=', 2)[1];
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Cookie", $"accessToken={token}");
        return await client.SendAsync(request);
    }

    [Fact]
    public async Task SinSesion_Responde401()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var response = await client.GetAsync("/api/v1/audit-logs");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ComoEmpleado_Responde404()
    {
        var empleado = await SeedUserAsync(UserRole.Empleado);

        var response = await GetComoAsync(empleado, "/api/v1/audit-logs");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ComoAdmin_FiltraPorAccionYTraeElNombreYLaHoraEnUtc()
    {
        var admin = await SeedUserAsync(UserRole.Administrador);
        var afectada = await SeedUserAsync(UserRole.Empleado, "Ana Martínez");
        await SeedEntradaAsync(admin.Id, AuditAction.EstadoUsuarioCambiado, afectada.Id);
        await SeedEntradaAsync(admin.Id, AuditAction.ContrasenaReseteada, afectada.Id);

        var response = await GetComoAsync(admin, "/api/v1/audit-logs?accion=EstadoUsuarioCambiado");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        // La base del factory es compartida entre los tests de esta clase.
        var item = Assert.Single(json.RootElement.GetProperty("items").EnumerateArray(),
            i => i.GetProperty("actorId").GetGuid() == admin.Id);
        Assert.Equal("EstadoUsuarioCambiado", item.GetProperty("accion").GetString());
        Assert.Equal("Ana Martínez", item.GetProperty("entidadNombre").GetString());
        Assert.EndsWith("Z", item.GetProperty("createdAt").GetString());
    }

    [Fact]
    public async Task ConHastaAnteriorADesde_Responde400()
    {
        var admin = await SeedUserAsync(UserRole.Administrador);

        var response = await GetComoAsync(admin, "/api/v1/audit-logs?desde=2026-10-05&hasta=2026-10-04");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task LoginReal_ApareceEnLaBitacoraComoInicioSesion()
    {
        var admin = await SeedUserAsync(UserRole.Administrador);
        var empleado = await SeedUserAsync(UserRole.Empleado, "Marta Gómez");
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { correo = empleado.Correo, password = Password });
        login.EnsureSuccessStatusCode();

        var response = await GetComoAsync(admin, "/api/v1/audit-logs?accion=InicioSesion&pageSize=100");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var item = Assert.Single(json.RootElement.GetProperty("items").EnumerateArray(),
            i => i.GetProperty("actorId").GetGuid() == empleado.Id);
        Assert.Equal("Marta Gómez", item.GetProperty("actorNombre").GetString());
        Assert.Equal(empleado.Id, item.GetProperty("entidadId").GetGuid());
    }
}
