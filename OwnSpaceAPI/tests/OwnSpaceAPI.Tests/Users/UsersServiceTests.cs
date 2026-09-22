using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Audit;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Users;

namespace OwnSpaceAPI.Tests.Users;

public class UsersServiceTests
{
    // Guid fijo sin usuario real detrás a propósito: RegistrarAsync
    // resuelve el nombre del actor con un FirstOrDefaultAsync que
    // tolera "no encontrado" (cae a un texto fijo) — estos tests no
    // verifican el contenido de la bitácora, solo que la acción
    // principal se haya podido registrar sin romper.
    private static readonly Guid ActorId = Guid.NewGuid();

    private sealed class FakePasswordResetService : IPasswordResetService
    {
        public string? UltimoCorreoInvitado { get; private set; }

        public Task IssueTemporaryPasswordAsync(string correo)
        {
            UltimoCorreoInvitado = correo;
            return Task.CompletedTask;
        }
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    // passwordHash con un valor por defecto no-null: la mayoría de los
    // fixtures representan usuarios que ya tienen una contraseña real
    // asignada (Activo/Desactivado establecidos) — solo los tests que
    // prueban específicamente el camino "nunca tuvo contraseña" (origen
    // Pendiente) pasan passwordHash: null explícitamente.
    private static User CrearUsuario(string nombre, string correo, UserRole rol = UserRole.Empleado, UserStatus estado = UserStatus.Activo, string? passwordHash = "hash-de-prueba") => new()
    {
        Id = Guid.NewGuid(),
        Nombre = nombre,
        Correo = correo,
        Rol = rol,
        Estado = estado,
        PasswordHash = passwordHash,
        FechaIngreso = new DateOnly(2020, 1, 1),
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task CreateAsync_ConDatosValidos_CreaUsuarioPendienteYDisparaInvitacion()
    {
        await using var db = CreateContext();
        var passwordResetService = new FakePasswordResetService();
        var service = new UsersService(db, passwordResetService, new AuditLogService(db));

        var user = await service.CreateAsync(ActorId, "Nuevo Empleado", "nuevo@devtch.com", UserRole.Empleado, new DateOnly(2026, 1, 1));

        Assert.Equal(UserStatus.Pendiente, user.Estado);
        Assert.Null(user.PasswordHash);
        Assert.Equal("nuevo@devtch.com", passwordResetService.UltimoCorreoInvitado);
    }

    [Fact]
    public async Task CreateAsync_ConCorreoYaExistente_TiraConflict()
    {
        await using var db = CreateContext();
        db.Users.Add(CrearUsuario("Ana Martínez", "ana.martinez@devtch.com"));
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));

        await Assert.ThrowsAsync<ConflictException>(
            () => service.CreateAsync(ActorId, "Otra Persona", "ana.martinez@devtch.com", UserRole.Empleado, new DateOnly(2026, 1, 1)));
    }

    [Fact]
    public async Task UpdateAsync_ConNombreNuevo_ActualizaSoloEseCampo()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.UpdateAsync(ActorId, user.Id, "Carlos Rivas Actualizado", null, null);

        Assert.Equal("Carlos Rivas Actualizado", actualizado.Nombre);
        Assert.Equal("carlos.rivas@devtch.com", actualizado.Correo);
    }

    [Fact]
    public async Task UpdateAsync_ConCorreoDeOtroUsuario_TiraConflict()
    {
        await using var db = CreateContext();
        var user1 = CrearUsuario("Julio Pérez", "julio.perez@devtch.com");
        var user2 = CrearUsuario("Laura Sánchez", "laura.sanchez@devtch.com");
        db.Users.AddRange(user1, user2);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));

        await Assert.ThrowsAsync<ConflictException>(
            () => service.UpdateAsync(ActorId, user2.Id, null, "julio.perez@devtch.com", null));
    }

    [Fact]
    public async Task UpdateAsync_ConElMismoCorreoQueYaTiene_NoDaFalsoPositivoDeConflicto()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Marta Gómez", "marta.gomez@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.UpdateAsync(ActorId, user.Id, null, "marta.gomez@devtch.com", null);

        Assert.Equal("marta.gomez@devtch.com", actualizado.Correo);
    }

    [Fact]
    public async Task UpdateAsync_ConIdInexistente_TiraNotFound()
    {
        await using var db = CreateContext();
        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));

        await Assert.ThrowsAsync<NotFoundException>(
            () => service.UpdateAsync(ActorId, Guid.NewGuid(), "Nombre", null, null));
    }

    [Fact]
    public async Task ListAsync_DevuelveTodosLosUsuariosOrdenadosPorNombre()
    {
        await using var db = CreateContext();
        db.Users.AddRange(
            CrearUsuario("Zulema Torres", "zulema@devtch.com"),
            CrearUsuario("Ana Martínez", "ana.martinez@devtch.com"));
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var usuarios = await service.ListAsync(1, 20);

        Assert.Equal(2, usuarios.Items.Count);
        Assert.Equal("Ana Martínez", usuarios.Items[0].Nombre);
    }

    [Fact]
    public async Task ResetPasswordAsync_DisparaLaEmisionDeUnaContraseñaTemporalParaElCorreo()
    {
        // El "dejar Pendiente"/setear el hash ya no lo hace UsersService
        // — lo delega por completo a IssueTemporaryPasswordAsync (probado
        // en PasswordResetServiceTests.cs). Acá solo importa que se
        // dispare para el correo correcto.
        await using var db = CreateContext();
        var user = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com", estado: UserStatus.Activo);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var passwordResetService = new FakePasswordResetService();
        var service = new UsersService(db, passwordResetService, new AuditLogService(db));
        await service.ResetPasswordAsync(ActorId, user.Id);

        Assert.Equal("ana.martinez@devtch.com", passwordResetService.UltimoCorreoInvitado);
    }

    [Fact]
    public async Task ResetPasswordAsync_ConIdInexistente_TiraNotFound()
    {
        await using var db = CreateContext();
        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));

        await Assert.ThrowsAsync<NotFoundException>(() => service.ResetPasswordAsync(ActorId, Guid.NewGuid()));
    }

    [Fact]
    public async Task ToggleStatusAsync_ConUsuarioActivo_LoDejaDesactivado()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com", estado: UserStatus.Activo);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, user.Id);

        Assert.Equal(UserStatus.Desactivado, actualizado.Estado);
    }

    [Fact]
    public async Task ToggleStatusAsync_ConUsuarioDesactivado_LoDejaActivo()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Marta Gómez", "marta.gomez@devtch.com", estado: UserStatus.Desactivado);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, user.Id);

        Assert.Equal(UserStatus.Activo, actualizado.Estado);
    }

    [Fact]
    public async Task ToggleStatusAsync_AlDesactivar_RegistraFechaDesactivacion()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com", estado: UserStatus.Activo);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, user.Id);

        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow), actualizado.FechaDesactivacion);
    }

    [Fact]
    public async Task ToggleStatusAsync_AlReactivar_LimpiaFechaDesactivacion()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Marta Gómez", "marta.gomez@devtch.com", estado: UserStatus.Desactivado);
        user.FechaDesactivacion = new DateOnly(2026, 3, 1);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, user.Id);

        Assert.Null(actualizado.FechaDesactivacion);
    }

    [Fact]
    public async Task ToggleStatusAsync_ConUsuarioPendiente_LoDejaDesactivado()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com", estado: UserStatus.Pendiente, passwordHash: null);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, user.Id);

        Assert.Equal(UserStatus.Desactivado, actualizado.Estado);
        Assert.Equal(DateOnly.FromDateTime(DateTime.UtcNow), actualizado.FechaDesactivacion);
    }

    [Fact]
    public async Task ToggleStatusAsync_AlReactivarUnoSinContraseñaReal_VuelveAPendiente()
    {
        await using var db = CreateContext();
        // Simula un Desactivado que llegó ahí desde Pendiente (nunca tuvo
        // PasswordHash asignado) — reactivarlo no debería dejarlo Activo,
        // porque no tiene con qué loguearse.
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com", estado: UserStatus.Desactivado, passwordHash: null);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, user.Id);

        Assert.Equal(UserStatus.Pendiente, actualizado.Estado);
        Assert.Null(actualizado.FechaDesactivacion);
    }

    [Fact]
    public async Task ToggleStatusAsync_SobreElUltimoAdminActivo_TiraConflictYNoLoDesactiva()
    {
        await using var db = CreateContext();
        var unicoAdmin = CrearUsuario("Julio Pérez", "julio.perez@devtch.com", rol: UserRole.Administrador);
        db.Users.Add(unicoAdmin);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));

        await Assert.ThrowsAsync<ConflictException>(() => service.ToggleStatusAsync(ActorId, unicoAdmin.Id));

        var sinCambios = await db.Users.SingleAsync(u => u.Id == unicoAdmin.Id);
        Assert.Equal(UserStatus.Activo, sinCambios.Estado);
    }

    [Fact]
    public async Task ToggleStatusAsync_SobreUnAdminConOtroAdminActivo_LoDesactivaSinProblema()
    {
        await using var db = CreateContext();
        var admin1 = CrearUsuario("Julio Pérez", "julio.perez@devtch.com", rol: UserRole.Administrador);
        var admin2 = CrearUsuario("Laura Sánchez", "laura.sanchez@devtch.com", rol: UserRole.Administrador);
        db.Users.AddRange(admin1, admin2);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.ToggleStatusAsync(ActorId, admin1.Id);

        Assert.Equal(UserStatus.Desactivado, actualizado.Estado);
    }

    [Fact]
    public async Task UpdateAsync_DegradandoAlUltimoAdminActivo_TiraConflictYNoLoDegrada()
    {
        await using var db = CreateContext();
        var unicoAdmin = CrearUsuario("Julio Pérez", "julio.perez@devtch.com", rol: UserRole.Administrador);
        db.Users.Add(unicoAdmin);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));

        await Assert.ThrowsAsync<ConflictException>(
            () => service.UpdateAsync(ActorId, unicoAdmin.Id, null, null, UserRole.Empleado));

        var sinCambios = await db.Users.SingleAsync(u => u.Id == unicoAdmin.Id);
        Assert.Equal(UserRole.Administrador, sinCambios.Rol);
    }

    [Fact]
    public async Task UpdateAsync_ConElMismoRolQueYaTiene_NoDisparaElGuardDelUltimoAdmin()
    {
        await using var db = CreateContext();
        var unicoAdmin = CrearUsuario("Julio Pérez", "julio.perez@devtch.com", rol: UserRole.Administrador);
        db.Users.Add(unicoAdmin);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService(), new AuditLogService(db));
        var actualizado = await service.UpdateAsync(ActorId, unicoAdmin.Id, "Julio Pérez Actualizado", null, UserRole.Administrador);

        Assert.Equal(UserRole.Administrador, actualizado.Rol);
    }
}
