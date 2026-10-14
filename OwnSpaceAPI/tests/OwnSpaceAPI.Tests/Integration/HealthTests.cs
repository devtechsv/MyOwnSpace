using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace OwnSpaceAPI.Tests.Integration;

// GET /health (Program.cs, MapHealthChecks): sin sesión, y sin detalles en
// la respuesta aunque algún chequeo falle.
public class HealthTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public HealthTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Health_SinSesionYConLaBaseDisponible_Responde200Healthy()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Health_SiUnChequeoFalla_Responde503SinElDetalle()
    {
        var client = _factory.WithWebHostBuilder(b => b.ConfigureServices(services =>
                services.AddHealthChecks().AddCheck("falla", () => HealthCheckResult.Unhealthy("detalle interno"))))
            .CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var cuerpo = await response.Content.ReadAsStringAsync();
        Assert.Equal("Unhealthy", cuerpo);
        Assert.DoesNotContain("detalle interno", cuerpo);
    }
}
