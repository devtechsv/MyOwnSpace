using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Users;

namespace OwnSpaceAPI.Tests.Users;

public class UsersServiceTests
{
    private sealed class FakePasswordResetService : IPasswordResetService
    {
        public string? UltimoCorreoInvitado { get; private set; }

        public Task RequestResetAsync(string correo)
        {
            UltimoCorreoInvitado = correo;
            return Task.CompletedTask;
        }

        public Task SetPasswordAsync(string token, string nuevaPassword) =>
            throw new NotSupportedException("No usado en estos tests.");
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static User CrearUsuario(string nombre, string correo, UserRole rol = UserRole.Empleado, UserStatus estado = UserStatus.Activo) => new()
    {
        Id = Guid.NewGuid(),
        Nombre = nombre,
        Correo = correo,
        Rol = rol,
        Estado = estado,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task CreateAsync_ConDatosValidos_CreaUsuarioPendienteYDisparaInvitacion()
    {
        await using var db = CreateContext();
        var passwordResetService = new FakePasswordResetService();
        var service = new UsersService(db, passwordResetService);

        var user = await service.CreateAsync("Nuevo Empleado", "nuevo@devtch.com", UserRole.Empleado);

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

        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<ConflictException>(
            () => service.CreateAsync("Otra Persona", "ana.martinez@devtch.com", UserRole.Empleado));
    }

    [Fact]
    public async Task CreateAsync_ConRolSuperAdmin_TiraBadRequest()
    {
        await using var db = CreateContext();
        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.CreateAsync("Alguien", "alguien@devtch.com", UserRole.SuperAdmin));
    }

    [Fact]
    public async Task UpdateAsync_ConNombreNuevo_ActualizaSoloEseCampo()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());
        var actualizado = await service.UpdateAsync(user.Id, "Carlos Rivas Actualizado", null, null);

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

        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<ConflictException>(
            () => service.UpdateAsync(user2.Id, null, "julio.perez@devtch.com", null));
    }

    [Fact]
    public async Task UpdateAsync_ConElMismoCorreoQueYaTiene_NoDaFalsoPositivoDeConflicto()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Marta Gómez", "marta.gomez@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());
        var actualizado = await service.UpdateAsync(user.Id, null, "marta.gomez@devtch.com", null);

        Assert.Equal("marta.gomez@devtch.com", actualizado.Correo);
    }

    [Fact]
    public async Task UpdateAsync_ConIdInexistente_TiraNotFound()
    {
        await using var db = CreateContext();
        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<NotFoundException>(
            () => service.UpdateAsync(Guid.NewGuid(), "Nombre", null, null));
    }

    [Fact]
    public async Task UpdateAsync_ConRolSuperAdmin_TiraBadRequest()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.UpdateAsync(user.Id, null, null, UserRole.SuperAdmin));
    }

    [Fact]
    public async Task ListAsync_DevuelveTodosLosUsuariosOrdenadosPorNombre()
    {
        await using var db = CreateContext();
        db.Users.AddRange(
            CrearUsuario("Zulema Torres", "zulema@devtch.com"),
            CrearUsuario("Ana Martínez", "ana.martinez@devtch.com"));
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());
        var usuarios = await service.ListAsync();

        Assert.Equal(2, usuarios.Count);
        Assert.Equal("Ana Martínez", usuarios[0].Nombre);
    }

    [Fact]
    public async Task ResetPasswordAsync_DejaAlUsuarioPendienteYDisparaInvitacion()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com", estado: UserStatus.Activo);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var passwordResetService = new FakePasswordResetService();
        var service = new UsersService(db, passwordResetService);
        await service.ResetPasswordAsync(user.Id);

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal(UserStatus.Pendiente, actualizado.Estado);
        Assert.Equal("ana.martinez@devtch.com", passwordResetService.UltimoCorreoInvitado);
    }

    [Fact]
    public async Task ResetPasswordAsync_ConIdInexistente_TiraNotFound()
    {
        await using var db = CreateContext();
        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<NotFoundException>(() => service.ResetPasswordAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task ToggleStatusAsync_ConUsuarioActivo_LoDejaDesactivado()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com", estado: UserStatus.Activo);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());
        var actualizado = await service.ToggleStatusAsync(user.Id);

        Assert.Equal(UserStatus.Desactivado, actualizado.Estado);
    }

    [Fact]
    public async Task ToggleStatusAsync_ConUsuarioDesactivado_LoDejaActivo()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Marta Gómez", "marta.gomez@devtch.com", estado: UserStatus.Desactivado);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());
        var actualizado = await service.ToggleStatusAsync(user.Id);

        Assert.Equal(UserStatus.Activo, actualizado.Estado);
    }

    [Fact]
    public async Task ToggleStatusAsync_ConUsuarioPendiente_TiraConflict()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com", estado: UserStatus.Pendiente);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new UsersService(db, new FakePasswordResetService());

        await Assert.ThrowsAsync<ConflictException>(() => service.ToggleStatusAsync(user.Id));
    }
}
