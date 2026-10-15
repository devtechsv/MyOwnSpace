using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Audit;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Tests.Audit;

public class AuditLogServiceTests
{
    private static readonly TimeSpan HoraElSalvador = TimeSpan.FromHours(-6);

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static User CrearUsuario(string nombre) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = nombre,
        Correo = $"{Guid.NewGuid():N}@devtch.com",
        Rol = UserRole.Empleado,
        Estado = UserStatus.Activo,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    // La hora se indica en hora de El Salvador; se guarda en UTC, como
    // RegistrarAsync.
    private static AuditLog Entrada(
        DateTimeOffset cuandoEnElSalvador, AuditAction accion = AuditAction.UsuarioEditado,
        AuditEntityType tipo = AuditEntityType.Usuario, Guid? entidadId = null) => new()
    {
        Id = Guid.NewGuid(),
        ActorId = Guid.NewGuid(),
        ActorNombre = "Julio Pérez",
        Accion = accion,
        EntidadTipo = tipo,
        EntidadId = entidadId ?? Guid.NewGuid(),
        CreatedAt = cuandoEnElSalvador.UtcDateTime,
    };

    private static DateTimeOffset Local(int dia, int hora, int minuto = 0) =>
        new(2026, 10, dia, hora, minuto, 0, HoraElSalvador);

    [Fact]
    public async Task ListarAsync_SinFiltros_DevuelveTodoDelMasNuevoAlMasViejo()
    {
        await using var db = CreateContext();
        var vieja = Entrada(Local(1, 9));
        var nueva = Entrada(Local(3, 9));
        var media = Entrada(Local(2, 9));
        db.AuditLogs.AddRange(vieja, nueva, media);
        await db.SaveChangesAsync();

        var resultado = await new AuditLogService(db).ListarAsync(null, null, null, 1, 20);

        Assert.Equal(3, resultado.TotalCount);
        Assert.Equal([nueva.Id, media.Id, vieja.Id], resultado.Items.Select(i => i.Log.Id));
    }

    [Fact]
    public async Task ListarAsync_FiltraPorAccion()
    {
        await using var db = CreateContext();
        var denegada = Entrada(Local(1, 9), AuditAction.SolicitudDenegada, AuditEntityType.Solicitud);
        db.AuditLogs.AddRange(
            denegada,
            Entrada(Local(1, 10)),
            Entrada(Local(1, 11), AuditAction.SolicitudAprobada, AuditEntityType.Solicitud));
        await db.SaveChangesAsync();

        var resultado = await new AuditLogService(db).ListarAsync(AuditAction.SolicitudDenegada, null, null, 1, 20);

        Assert.Equal(1, resultado.TotalCount);
        Assert.Equal(denegada.Id, Assert.Single(resultado.Items).Log.Id);
    }

    [Fact]
    public async Task ListarAsync_LasFechasSonDiasEnHoraDeElSalvador()
    {
        // 23:30 del 5 en El Salvador ya es 6 de octubre en UTC: igual tiene
        // que contar como del 5. Y 00:30 del 6 (local) ya no es del 5.
        await using var db = CreateContext();
        var primeraDelDia = Entrada(Local(5, 0, 0));
        var ultimaDelDia = Entrada(Local(5, 23, 30));
        db.AuditLogs.AddRange(Entrada(Local(4, 23, 59)), primeraDelDia, ultimaDelDia, Entrada(Local(6, 0, 30)));
        await db.SaveChangesAsync();

        var dia5 = new DateOnly(2026, 10, 5);
        var resultado = await new AuditLogService(db).ListarAsync(null, dia5, dia5, 1, 20);

        Assert.Equal([ultimaDelDia.Id, primeraDelDia.Id], resultado.Items.Select(i => i.Log.Id));
    }

    [Fact]
    public async Task ListarAsync_SoloDesdeOSoloHasta_DejanElOtroExtremoAbierto()
    {
        await using var db = CreateContext();
        var antes = Entrada(Local(1, 9));
        var despues = Entrada(Local(9, 9));
        db.AuditLogs.AddRange(antes, despues);
        await db.SaveChangesAsync();
        var service = new AuditLogService(db);

        var desde = await service.ListarAsync(null, new DateOnly(2026, 10, 5), null, 1, 20);
        var hasta = await service.ListarAsync(null, null, new DateOnly(2026, 10, 5), 1, 20);

        Assert.Equal(despues.Id, Assert.Single(desde.Items).Log.Id);
        Assert.Equal(antes.Id, Assert.Single(hasta.Items).Log.Id);
    }

    [Fact]
    public async Task ListarAsync_ConHastaAnteriorADesde_TiraBadRequest()
    {
        await using var db = CreateContext();

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => new AuditLogService(db)
            .ListarAsync(null, new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 4), 1, 20));

        Assert.Equal("La fecha final no puede ser anterior a la inicial.", ex.Message);
    }

    [Fact]
    public async Task ListarAsync_TraeElNombreDeLoAfectado()
    {
        await using var db = CreateContext();
        var ana = CrearUsuario("Ana Martínez");
        var carlos = CrearUsuario("Carlos Rivas");
        var solicitudDeCarlos = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = carlos.Id,
            Tipo = RequestType.Vacaciones,
            FechaInicio = new DateOnly(2026, 10, 12),
            FechaFin = new DateOnly(2026, 10, 16),
            HorasSolicitadas = 40m,
            Motivo = "Vacaciones",
            Estado = RequestStatus.Aprobada,
            CreatedAt = DateTime.UtcNow,
        };
        db.Users.AddRange(ana, carlos);
        db.LeaveRequests.Add(solicitudDeCarlos);
        db.AuditLogs.AddRange(
            Entrada(Local(3, 9), entidadId: ana.Id),
            Entrada(Local(2, 9), AuditAction.SolicitudAprobada, AuditEntityType.Solicitud, solicitudDeCarlos.Id),
            // Lo afectado ya no existe.
            Entrada(Local(1, 9)));
        await db.SaveChangesAsync();

        var resultado = await new AuditLogService(db).ListarAsync(null, null, null, 1, 20);

        Assert.Equal(["Ana Martínez", "Carlos Rivas", null], resultado.Items.Select(i => i.EntidadNombre));
    }

    [Fact]
    public async Task ListarAsync_PaginaYAcotaElTamano()
    {
        await using var db = CreateContext();
        for (var i = 0; i < 5; i++)
        {
            db.AuditLogs.Add(Entrada(Local(1, 8 + i)));
        }
        await db.SaveChangesAsync();
        var service = new AuditLogService(db);

        var segunda = await service.ListarAsync(null, null, null, 2, 2);
        var acotada = await service.ListarAsync(null, null, null, 0, 1000);

        Assert.Equal(5, segunda.TotalCount);
        Assert.Equal(2, segunda.Items.Count);
        Assert.Equal(2, segunda.Page);
        Assert.Equal(1, acotada.Page);
        Assert.Equal(100, acotada.PageSize);
    }

    [Fact]
    public async Task ListarAsync_EntradaSinEntidad_DevuelveEntidadNombreNull()
    {
        await using var db = CreateContext();
        // Inicio de sesión fallido con un correo no registrado.
        var entrada = Entrada(Local(1, 9), AuditAction.InicioSesionFallido);
        entrada.ActorId = null;
        entrada.EntidadId = null;
        db.AuditLogs.Add(entrada);
        await db.SaveChangesAsync();

        var resultado = await new AuditLogService(db).ListarAsync(null, null, null, 1, 20);

        var item = Assert.Single(resultado.Items);
        Assert.Null(item.Log.EntidadId);
        Assert.Null(item.EntidadNombre);
    }
}
