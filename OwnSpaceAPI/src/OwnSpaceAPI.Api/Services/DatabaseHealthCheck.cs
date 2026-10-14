using Microsoft.Extensions.Diagnostics.HealthChecks;
using OwnSpaceAPI.Api.Data;

namespace OwnSpaceAPI.Api.Services;

// Lo usa GET /health (Program.cs). Sin la base no funciona ningún endpoint
// salvo logout, así que "la API responde" no alcanza para decir que está
// sana: tiene que poder conectarse a SQL Server.
public sealed class DatabaseHealthCheck : IHealthCheck
{
    private readonly AppDbContext _db;

    public DatabaseHealthCheck(AppDbContext db)
    {
        _db = db;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        // CanConnectAsync no lanza: devuelve false si no hay conexión.
        await _db.Database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy("No hay conexión con la base de datos.");
}
