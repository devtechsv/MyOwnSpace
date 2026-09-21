using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Tests.Pto;

public class PtoRequestsServiceTests
{
    private sealed class FakeEmailSender : IEmailSender
    {
        public string? UltimoDestinatario { get; private set; }

        public Task SendAsync(string destinatario, string asunto, string cuerpo)
        {
            UltimoDestinatario = destinatario;
            return Task.CompletedTask;
        }
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    // Ingreso muy en el pasado: garantiza balance disponible de sobra
    // hoy, sin acoplarse a una fecha fija.
    private static User CrearUsuario() => new()
    {
        Id = Guid.NewGuid(),
        Nombre = "Empleado de prueba",
        Correo = $"{Guid.NewGuid():N}@devtch.com",
        Rol = UserRole.Empleado,
        Estado = UserStatus.Activo,
        FechaIngreso = new DateOnly(2020, 1, 1),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    private static (AppDbContext db, User user, PtoRequestsService service, FakeEmailSender emailSender) Preparar()
    {
        var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        db.SaveChanges();

        var emailSender = new FakeEmailSender();
        var service = new PtoRequestsService(db, new PtoBalanceService(db), emailSender);
        return (db, user, service, emailSender);
    }

    [Fact]
    public async Task CrearAsync_ConHorasDentroDelBalance_CreaLaSolicitudAprobadaYNotifica()
    {
        var (db, user, service, emailSender) = Preparar();
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

        var creada = await service.CrearAsync(user.Id, hoy, 8m);

        Assert.Equal(RequestType.Vacaciones, creada.Tipo);
        Assert.Equal(RequestStatus.Aprobada, creada.Estado);
        Assert.Equal(8m, creada.HorasSolicitadas);
        Assert.Equal(hoy, creada.FechaInicio);
        Assert.Equal(hoy, creada.FechaFin);
        Assert.Null(creada.ReviewedBy);
        Assert.Equal(user.Correo, emailSender.UltimoDestinatario);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_DescuentaElBalanceRealmente()
    {
        var (db, user, service, _) = Preparar();
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        var balanceService = new PtoBalanceService(db);
        var balanceAntes = await balanceService.CalcularBalanceAsync(user.Id);

        await service.CrearAsync(user.Id, hoy, 8m);

        var balanceDespues = await balanceService.CalcularBalanceAsync(user.Id);
        Assert.Equal(balanceAntes - 8m, balanceDespues);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_ConHorasQueSuperanElBalance_TiraConflictYNoCreaNada()
    {
        await using var db = CreateContext();
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        // FechaIngreso en el futuro: garantiza balance 0 sin depender de
        // qué día se corra el test (si usáramos "hoy" como ingreso, un
        // 15 o último día de mes real daría 5h por casualidad).
        var user = CrearUsuario();
        user.FechaIngreso = hoy.AddDays(1);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PtoRequestsService(db, new PtoBalanceService(db), new FakeEmailSender());

        // 1h está dentro del rango válido (0, 8] pero supera el balance
        // (0) — aísla el chequeo de balance del chequeo de tope diario.
        await Assert.ThrowsAsync<ConflictException>(() => service.CrearAsync(user.Id, hoy, 1m));

        Assert.Empty(db.LeaveRequests);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(8.5)]
    public async Task CrearAsync_ConHorasFueraDeRango_TiraBadRequest(decimal horas)
    {
        var (db, user, service, _) = Preparar();
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);

        await Assert.ThrowsAsync<BadRequestException>(() => service.CrearAsync(user.Id, hoy, horas));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_SegundaReservaMismaFecha_TiraConflict()
    {
        var (db, user, service, _) = Preparar();
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        await service.CrearAsync(user.Id, hoy, 4m);

        await Assert.ThrowsAsync<ConflictException>(() => service.CrearAsync(user.Id, hoy, 2m));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task ListarEquipoAsync_DevuelveSoloVacacionesAprobadas()
    {
        var (db, user, service, _) = Preparar();
        var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
        await service.CrearAsync(user.Id, hoy, 8m);

        db.LeaveRequests.Add(new LeaveRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = user.Id,
            Tipo = RequestType.Emergencia,
            FechaInicio = hoy,
            FechaFin = hoy,
            Motivo = "Otra cosa",
            Estado = RequestStatus.Pendiente,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var equipo = await service.ListarEquipoAsync();

        Assert.Single(equipo);
        Assert.Equal(RequestType.Vacaciones, equipo[0].Tipo);
        await db.DisposeAsync();
    }
}