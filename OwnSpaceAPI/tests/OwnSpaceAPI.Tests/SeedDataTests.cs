using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class SeedDataTests
{
    [Fact]
    public async Task SeedAdminAsync_LaFechaDeIngresoEsLaDeElSalvador()
    {
        // 19:30 en El Salvador del 5 de octubre = 01:30 UTC del 6.
        var clock = new RelojEnInstante(new DateTimeOffset(2026, 10, 5, 19, 30, 0, TimeSpan.FromHours(-6)));
        await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Seed:AdminPassword"] = "Semilla#Valida2026" })
            .Build();

        await SeedData.SeedAdminAsync(db, new PasswordHashingService(), configuration, NullLogger.Instance, clock);

        var admin = await db.Users.SingleAsync(u => u.Rol == UserRole.Administrador);
        Assert.Equal(new DateOnly(2026, 10, 5), admin.FechaIngreso);
    }
}
