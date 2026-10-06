using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Tests.Pto;

public class PtoBalanceServiceTests
{
    // Lunes. Con ingreso 2024-01-15 hay dos años laborales cerrados y el
    // tercero en curso (desde 2026-01-15).
    private static readonly DateOnly Hoy = new(2026, 10, 5);
    private static readonly DateOnly Ingreso = new(2024, 1, 15);

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static PtoBalanceService CrearServicio(AppDbContext db) => new(db, new RelojFijo(Hoy));

    private static User CrearUsuario(DateOnly? ingreso = null) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = "Empleado de prueba",
        Correo = $"{Guid.NewGuid():N}@devtch.com",
        Rol = UserRole.Empleado,
        Estado = UserStatus.Activo,
        FechaIngreso = ingreso ?? Ingreso,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    // Reclamo del 2do año laboral completo (2025-01-15..2026-01-14): 24
    // quincenas = 120h, ya habilitadas al 2026-01-15.
    private static PtoClaim ReclamoSegundoAño(Guid employeeId) => new()
    {
        Id = Guid.NewGuid(),
        EmployeeId = employeeId,
        CorteDesde = new DateOnly(2025, 1, 15),
        CorteHasta = new DateOnly(2026, 1, 14),
        Horas = 120m,
        CreatedAt = DateTime.UtcNow,
    };

    private static LeaveRequest CrearSolicitud(
        Guid employeeId, RequestType tipo, RequestStatus estado, DateOnly desde, DateOnly hasta,
        decimal? horas = null, TimeOnly? horaInicio = null) => new()
    {
        Id = Guid.NewGuid(),
        EmployeeId = employeeId,
        Tipo = tipo,
        FechaInicio = desde,
        FechaFin = hasta,
        HoraInicio = horaInicio,
        HoraFin = horaInicio?.AddHours(2),
        HorasSolicitadas = horas,
        Motivo = "Prueba",
        Estado = estado,
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task ObtenerResumenAsync_El31DeDiciembreALas1130PmHoraLocal_TodaviaPermiteReclamarLoDelAño()
    {
        // Regresión: con "hoy" en UTC, a las 11:30 p. m. del 31-dic en San
        // Salvador ya era 1-ene — lo acumulado del año se perdía 6 horas antes.
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var service = new PtoBalanceService(db, new RelojEnInstante(DateTimeOffset.Parse("2027-01-01T05:30:00Z")));

        var resumen = await service.ObtenerResumenAsync(user.Id);

        Assert.Equal(new DateOnly(2026, 12, 31), resumen.FechaLimiteReclamo);
        // Las 24 quincenas de 2026, todavía reclamables.
        Assert.Equal(120m, resumen.HorasAcumuladas);
    }

    [Fact]
    public async Task ObtenerResumenAsync_SeparaAcumuladasReclamadasYDisponibles()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        db.PtoClaims.Add(ReclamoSegundoAño(user.Id));
        await db.SaveChangesAsync();

        var resumen = await CrearServicio(db).ObtenerResumenAsync(user.Id);

        Assert.Equal(120m, resumen.HorasDisponibles);
        // Sin reclamar desde 2026-01-15 hasta hoy: 15-ene..30-sep = 18 cortes.
        Assert.Equal(90m, resumen.HorasAcumuladas);
        Assert.Equal(0m, resumen.HorasReclamadasBloqueadas);
        Assert.Equal(new DateOnly(2027, 1, 15), resumen.FechaProximaHabilitacion);
        Assert.Equal(new DateOnly(2026, 12, 31), resumen.FechaLimiteReclamo);
    }

    [Fact]
    public async Task ReclamarAsync_PasaLoAcumuladoAReclamadasBloqueadasDelAñoEnCurso()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        db.PtoClaims.Add(ReclamoSegundoAño(user.Id));
        await db.SaveChangesAsync();

        var resumen = await CrearServicio(db).ReclamarAsync(user.Id);

        Assert.Equal(0m, resumen.HorasAcumuladas);
        Assert.Equal(90m, resumen.HorasReclamadasBloqueadas);
        Assert.Equal(120m, resumen.HorasDisponibles);
        var reclamo = await db.PtoClaims.SingleAsync(c => c.CorteDesde == new DateOnly(2026, 1, 15));
        Assert.Equal(Hoy, reclamo.CorteHasta);
        Assert.Equal(90m, reclamo.Horas);
    }

    [Fact]
    public async Task ReclamarAsync_SinNadaAcumulado_TiraBadRequestYNoGuardaNada()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var service = CrearServicio(db);
        await service.ReclamarAsync(user.Id);

        await Assert.ThrowsAsync<BadRequestException>(() => service.ReclamarAsync(user.Id));
        Assert.Equal(1, await db.PtoClaims.CountAsync());
    }

    [Fact]
    public async Task CalcularDisponibleAsync_DescuentaAprobadasYPendientesPeroNoDenegadas()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        db.PtoClaims.Add(ReclamoSegundoAño(user.Id));
        db.LeaveRequests.AddRange(
            CrearSolicitud(user.Id, RequestType.Vacaciones, RequestStatus.Aprobada, Hoy, Hoy, 8m),
            CrearSolicitud(user.Id, RequestType.Vacaciones, RequestStatus.Pendiente, Hoy.AddDays(7), Hoy.AddDays(8), 16m),
            CrearSolicitud(user.Id, RequestType.Vacaciones, RequestStatus.Denegada, Hoy.AddDays(14), Hoy.AddDays(14), 8m));
        await db.SaveChangesAsync();

        Assert.Equal(96m, await CrearServicio(db).CalcularDisponibleAsync(user.Id));
    }

    [Fact]
    public async Task CalcularDisponibleAsync_ConExclusion_NoDescuentaLaSolicitudIndicada()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        db.PtoClaims.Add(ReclamoSegundoAño(user.Id));
        var pendiente = CrearSolicitud(user.Id, RequestType.Vacaciones, RequestStatus.Pendiente, Hoy, Hoy.AddDays(4), 40m);
        db.LeaveRequests.Add(pendiente);
        await db.SaveChangesAsync();

        Assert.Equal(120m, await CrearServicio(db).CalcularDisponibleAsync(user.Id, excluirSolicitudId: pendiente.Id));
    }

    [Fact]
    public async Task ObtenerResumenAsync_SoloLasAusenciasAprobadasDeDiaCompletoDescuentanDiasTrabajados()
    {
        await using var db = CreateContext();
        var user = CrearUsuario();
        db.Users.Add(user);
        // Lun 2026-09-28 a vie 2026-10-02: 5 días hábiles de enfermedad.
        db.LeaveRequests.AddRange(
            CrearSolicitud(user.Id, RequestType.Enfermedad, RequestStatus.Aprobada, new DateOnly(2026, 9, 28), new DateOnly(2026, 10, 2)),
            CrearSolicitud(user.Id, RequestType.Emergencia, RequestStatus.Denegada, new DateOnly(2026, 9, 21), new DateOnly(2026, 9, 21)),
            CrearSolicitud(user.Id, RequestType.Otro, RequestStatus.Aprobada, new DateOnly(2026, 9, 22), new DateOnly(2026, 9, 22), horaInicio: new TimeOnly(9, 0)));
        await db.SaveChangesAsync();

        var sinAusencias = PtoBalanceCalculator.ContarDiasHabiles(new DateOnly(2026, 1, 15), Hoy);
        var resumen = await CrearServicio(db).ObtenerResumenAsync(user.Id);

        Assert.Equal(sinAusencias - 5, resumen.DiasTrabajadosAnioLaboral);
    }

    [Fact]
    public async Task ObtenerResumenAsync_ConUsuarioInexistente_TiraNotFound()
    {
        await using var db = CreateContext();

        await Assert.ThrowsAsync<NotFoundException>(() => CrearServicio(db).ObtenerResumenAsync(Guid.NewGuid()));
    }
}
