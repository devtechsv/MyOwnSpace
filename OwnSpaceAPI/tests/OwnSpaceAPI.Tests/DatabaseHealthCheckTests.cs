using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class DatabaseHealthCheckTests
{
    private static Task<HealthCheckResult> ChequearAsync(AppDbContext db) =>
        new DatabaseHealthCheck(db).CheckHealthAsync(new HealthCheckContext());

    [Fact]
    public async Task ConLaBaseDisponible_EsHealthy()
    {
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

        var resultado = await ChequearAsync(db);

        Assert.Equal(HealthStatus.Healthy, resultado.Status);
    }

    [Fact]
    public async Task SinConexionConSqlServer_EsUnhealthy()
    {
        // Puerto 1 de localhost: nadie escucha ahí, la conexión se rechaza
        // al instante (sin reintentos ni esperas largas).
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=127.0.0.1,1;Database=NoExiste;User Id=x;Password=x;Connect Timeout=2;ConnectRetryCount=0;TrustServerCertificate=True")
            .Options);

        var resultado = await ChequearAsync(db);

        Assert.Equal(HealthStatus.Unhealthy, resultado.Status);
    }
}
