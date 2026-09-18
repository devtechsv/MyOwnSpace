using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Mvc.Testing;
using OwnSpaceAPI.Api.Data;

namespace OwnSpaceAPI.Tests.Integration;

// Levanta la app real (pipeline HTTP completo: middlewares, [Authorize],
// NotFoundOnForbidResultHandler, JWT) contra una base InMemory en vez de
// SQL Server. Ambiente "Testing" (no "Development") para que no corran
// Swagger ni el seed real — cada test siembra exactamente lo que necesita.
public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = Guid.NewGuid().ToString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // UseSetting (no ConfigureAppConfiguration) para la connection
        // string: Program.cs la lee y la valida en código de nivel
        // superior, ANTES de que Build() termine — ConfigureAppConfiguration
        // solo queda disponible recién ahí. UseSetting sí está disponible
        // desde el arranque. Nunca se conecta de verdad: ConfigureServices,
        // más abajo, reemplaza el DbContext entero por InMemory.
        builder.UseSetting("ConnectionStrings:DefaultConnection", "Server=(local);Database=Ignored;Trusted_Connection=True;");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SigningKey"] = "clave-de-pruebas-de-integracion-bien-larga-1234567890",
                ["Jwt:Issuer"] = "OwnSpaceAPI.Tests",
                ["Jwt:Audience"] = "OwnSpaceAPI.Tests",
                ["Cors:AllowedOrigins:0"] = "http://localhost:3000",
            });
        });

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_dbName));
        });
    }
}