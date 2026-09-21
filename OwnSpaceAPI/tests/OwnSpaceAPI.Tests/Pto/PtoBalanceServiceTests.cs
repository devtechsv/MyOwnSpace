using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Tests.Pto;

public class PtoBalanceServiceTests
{
    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    // Ingreso muy en el pasado: garantiza suficientes horas acumuladas
    // hoy (cualquiera sea "hoy" al correr el test) para los descuentos
    // que prueban estos tests, sin acoplarse a una fecha fija.
    private static User CrearUsuario(UserRole rol = UserRole.Empleado) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = "Empleado de prueba",
        Correo = $"{Guid.NewGuid():N}@devtch.com",
        Rol = rol,
        Estado = UserStatus.Activo,
        FechaIngreso = new DateOnly(2020, 1, 1),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    private static LeaveRequest CrearSolicitudVacaciones(
        Guid employeeId, decimal horas, RequestStatus estado, DateOnly fechaInicio) => new()
    {
        Id = Guid.NewGuid(),
        EmployeeId = employeeId,
        Tipo = RequestType.Vacaciones,
        FechaInicio = fechaInicio,
        FechaFin = fechaInicio,
        HorasSolicitadas = horas,
        Motivo = "PTO",
        Estado = estado,
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task CalcularBalanceAsync_RestaLasHorasYaAprobadasEsteAño()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        db.LeaveRequests.Add(CrearSolicitudVacaciones(user.Id, 8m, RequestStatus.Aprobada, hoy));
        await db.SaveChangesAsync();

        var service = new PtoBalanceService(db);
        var balance = await service.CalcularBalanceAsync(user.Id);

        var esperado = PtoBalanceCalculator.CalcularHorasAcumuladas(user.FechaIngreso, null, hoy) - 8m;
        Assert.Equal(esperado, balance);
    }

    [Fact]
    public async Task CalcularBalanceAsync_IgnoraSolicitudesPendientesYDenegadas()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        db.LeaveRequests.Add(CrearSolicitudVacaciones(user.Id, 8m, RequestStatus.Pendiente, hoy));
        db.LeaveRequests.Add(CrearSolicitudVacaciones(user.Id, 8m, RequestStatus.Denegada, hoy));
        await db.SaveChangesAsync();

        var service = new PtoBalanceService(db);
        var balance = await service.CalcularBalanceAsync(user.Id);

        var esperado = PtoBalanceCalculator.CalcularHorasAcumuladas(user.FechaIngreso, null, hoy);
        Assert.Equal(esperado, balance);
    }

    [Fact]
    public async Task CalcularBalanceAsync_IgnoraSolicitudesAprobadasDeAñosAnteriores()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        db.LeaveRequests.Add(CrearSolicitudVacaciones(
            user.Id, 8m, RequestStatus.Aprobada, new DateOnly(hoy.Year - 1, 6, 1)));
        await db.SaveChangesAsync();

        var service = new PtoBalanceService(db);
        var balance = await service.CalcularBalanceAsync(user.Id);

        var esperado = PtoBalanceCalculator.CalcularHorasAcumuladas(user.FechaIngreso, null, hoy);
        Assert.Equal(esperado, balance);
    }

    [Fact]
    public async Task CalcularBalanceAsync_NuncaDevuelveNegativo()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var acumuladas = PtoBalanceCalculator.CalcularHorasAcumuladas(user.FechaIngreso, null, hoy);
        // Consume mucho más de lo acumulado — no debería poder pasar en
        // operación normal (Fase 2 valida al crear), pero el cálculo en
        // sí tiene que quedar protegido igual.
        db.LeaveRequests.Add(CrearSolicitudVacaciones(user.Id, acumuladas + 1000m, RequestStatus.Aprobada, hoy));
        await db.SaveChangesAsync();

        var service = new PtoBalanceService(db);
        var balance = await service.CalcularBalanceAsync(user.Id);

        Assert.Equal(0m, balance);
    }

    [Fact]
    public async Task CalcularBalanceAsync_ConUsuarioInexistente_TiraNotFound()
    {
        await using var db = CreateContext();
        var service = new PtoBalanceService(db);

        await Assert.ThrowsAsync<NotFoundException>(() => service.CalcularBalanceAsync(Guid.NewGuid()));
    }
}
