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

    private static readonly DateOnly Hoy = new(2026, 10, 5); // lunes

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static User CrearUsuario(DateOnly ingreso) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = "Empleado de prueba",
        Correo = $"{Guid.NewGuid():N}@devtch.com",
        Rol = UserRole.Empleado,
        Estado = UserStatus.Activo,
        FechaIngreso = ingreso,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    private static PtoClaim Reclamo(Guid employeeId, DateOnly desde, DateOnly hasta) => new()
    {
        Id = Guid.NewGuid(),
        EmployeeId = employeeId,
        CorteDesde = desde,
        CorteHasta = hasta,
        Horas = PtoBalanceCalculator.ContarQuincenasCompletadas(desde, hasta) * PtoBalanceCalculator.HorasPorQuincena,
        CreatedAt = DateTime.UtcNow,
    };

    // Empleado con 120h reclamadas y habilitadas (2do año laboral completo).
    private static (AppDbContext db, User user, PtoRequestsService service, FakeEmailSender emailSender) Preparar(bool conSaldo = true)
    {
        var db = CreateContext();
        var user = CrearUsuario(new DateOnly(2024, 1, 15));
        db.Users.Add(user);
        if (conSaldo)
        {
            db.PtoClaims.Add(Reclamo(user.Id, new DateOnly(2025, 1, 15), new DateOnly(2026, 1, 14)));
        }
        db.SaveChanges();

        var emailSender = new FakeEmailSender();
        var reloj = new RelojFijo(Hoy);
        var service = new PtoRequestsService(db, new PtoBalanceService(db, reloj), emailSender, reloj);
        return (db, user, service, emailSender);
    }

    private static Task<decimal> DisponibleAsync(AppDbContext db, Guid userId) =>
        new PtoBalanceService(db, new RelojFijo(Hoy)).CalcularDisponibleAsync(userId);

    [Fact]
    public async Task CrearAsync_ConHorasDentroDelBalance_CreaLaSolicitudAprobadaYNotifica()
    {
        var (db, user, service, emailSender) = Preparar();

        var creada = await service.CrearAsync(user.Id, Hoy, 8m);

        Assert.Equal(RequestType.Vacaciones, creada.Tipo);
        Assert.Equal(RequestStatus.Aprobada, creada.Estado);
        Assert.Equal(8m, creada.HorasSolicitadas);
        Assert.Equal(Hoy, creada.FechaInicio);
        Assert.Equal(Hoy, creada.FechaFin);
        Assert.Null(creada.ReviewedBy);
        Assert.Equal(user.Correo, emailSender.UltimoDestinatario);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_DescuentaElBalanceRealmente()
    {
        var (db, user, service, _) = Preparar();

        await service.CrearAsync(user.Id, Hoy, 8m);

        Assert.Equal(112m, await DisponibleAsync(db, user.Id));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_SinHorasReclamadas_TiraConflictYNoCreaNada()
    {
        // Tiene 90h acumuladas en 2026, pero sin reclamar no se pueden usar.
        var (db, user, service, _) = Preparar(conSaldo: false);

        await Assert.ThrowsAsync<ConflictException>(() => service.CrearAsync(user.Id, Hoy, 1m));
        Assert.Empty(db.LeaveRequests);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_ConReclamadasDelPrimerAñoAunBloqueadas_TiraConflict()
    {
        await using var db = CreateContext();
        var user = CrearUsuario(new DateOnly(2026, 4, 6));
        db.Users.Add(user);
        db.PtoClaims.Add(Reclamo(user.Id, user.FechaIngreso, new DateOnly(2026, 9, 30)));
        await db.SaveChangesAsync();
        var reloj = new RelojFijo(Hoy);
        var service = new PtoRequestsService(db, new PtoBalanceService(db, reloj), new FakeEmailSender(), reloj);

        await Assert.ThrowsAsync<ConflictException>(() => service.CrearAsync(user.Id, Hoy, 8m));
        Assert.Empty(db.LeaveRequests);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(8.5)]
    public async Task CrearAsync_ConHorasFueraDeRango_TiraBadRequest(decimal horas)
    {
        var (db, user, service, _) = Preparar();

        await Assert.ThrowsAsync<BadRequestException>(() => service.CrearAsync(user.Id, Hoy, horas));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task CrearAsync_SegundaReservaMismaFecha_TiraConflict()
    {
        var (db, user, service, _) = Preparar();
        await service.CrearAsync(user.Id, Hoy, 4m);

        await Assert.ThrowsAsync<ConflictException>(() => service.CrearAsync(user.Id, Hoy, 2m));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task SolicitarRangoAsync_CreaPendienteConDiasHabilesPorOchoHoras()
    {
        var (db, user, service, _) = Preparar();

        // Jueves 15 a martes 20 de octubre: jue, vie, lun, mar = 4 días.
        var solicitud = await service.SolicitarRangoAsync(user.Id, new DateOnly(2026, 10, 15), new DateOnly(2026, 10, 20), null);

        Assert.Equal(RequestType.Vacaciones, solicitud.Tipo);
        Assert.Equal(RequestStatus.Pendiente, solicitud.Estado);
        Assert.Equal(32m, solicitud.HorasSolicitadas);
        // La pendiente aparta su saldo.
        Assert.Equal(88m, await DisponibleAsync(db, user.Id));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task SolicitarRangoAsync_QueIniciaEnFinDeSemana_TiraBadRequest()
    {
        var (db, user, service, _) = Preparar();

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.SolicitarRangoAsync(user.Id, new DateOnly(2026, 10, 10), new DateOnly(2026, 10, 14), null));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task SolicitarRangoAsync_EnFechasPasadas_TiraBadRequest()
    {
        var (db, user, service, _) = Preparar();

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.SolicitarRangoAsync(user.Id, new DateOnly(2026, 10, 1), new DateOnly(2026, 10, 2), null));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task SolicitarRangoAsync_QueSeCruzaConUnaReserva_TiraConflict()
    {
        var (db, user, service, _) = Preparar();
        await service.CrearAsync(user.Id, new DateOnly(2026, 10, 14), 8m);

        await Assert.ThrowsAsync<ConflictException>(
            () => service.SolicitarRangoAsync(user.Id, new DateOnly(2026, 10, 12), new DateOnly(2026, 10, 16), null));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task SolicitarRangoAsync_QueSuperaElSaldo_TiraConflictYNoCreaNada()
    {
        var (db, user, service, _) = Preparar();

        // 12-oct a 13-nov: 25 días hábiles = 200h > 120h.
        await Assert.ThrowsAsync<ConflictException>(
            () => service.SolicitarRangoAsync(user.Id, new DateOnly(2026, 10, 12), new DateOnly(2026, 11, 13), null));
        Assert.Empty(db.LeaveRequests);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task ListarEquipoAsync_DevuelveSoloVacacionesAprobadas()
    {
        var (db, user, service, _) = Preparar();
        await service.CrearAsync(user.Id, Hoy, 8m);

        db.LeaveRequests.Add(new LeaveRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = user.Id,
            Tipo = RequestType.Emergencia,
            FechaInicio = Hoy,
            FechaFin = Hoy,
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
