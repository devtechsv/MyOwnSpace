using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Tests.Auth;

public class AuthServiceTests
{
    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User CrearUsuarioActivo(IPasswordHashingService hasher, string correo, string password)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Usuario de Prueba",
            Correo = correo,
            Rol = UserRole.Empleado,
            Estado = UserStatus.Activo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = hasher.Hash(user, password);
        return user;
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConCredencialesCorrectas_DevuelveElUsuario()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ValidateCredentialsAsync("empleado@devtch.com", "Correcta123!");

        Assert.Equal(user.Id, resultado.Id);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_EsInsensibleAMayusculasEnElCorreo()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ValidateCredentialsAsync("EMPLEADO@DEVTCH.COM", "Correcta123!");

        Assert.Equal(user.Id, resultado.Id);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConContraseniaIncorrecta_TiraUnauthorized()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("empleado@devtch.com", "Incorrecta456!"));
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConCorreoInexistente_TiraUnauthorized()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("no-existe@devtch.com", "Cualquiera123!"));
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConUsuarioDesactivado_TiraUnauthorized_AunqueLaContraseniaSeaCorrecta()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        user.Estado = UserStatus.Desactivado;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("empleado@devtch.com", "Correcta123!"));
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConUsuarioPendienteSinContrasenia_TiraUnauthorized()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Usuario Pendiente",
            Correo = "pendiente@devtch.com",
            Rol = UserRole.Empleado,
            Estado = UserStatus.Pendiente,
            PasswordHash = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("pendiente@devtch.com", "CualquierCosa123!"));
    }

    [Fact]
    public async Task ChangePasswordAsync_ConLaContraseniaActualCorrecta_CambiaElHashYElStamp()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        var stampAnterior = user.SecurityStamp;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        await service.ChangePasswordAsync(user.Id, "Correcta123!", "NuevaSegura456!");

        Assert.NotEqual(stampAnterior, user.SecurityStamp);
        Assert.True(hasher.Verify(user, user.PasswordHash!, "NuevaSegura456!"));
    }

    [Fact]
    public async Task ChangePasswordAsync_ConLaContraseniaActualIncorrecta_TiraUnauthorized()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ChangePasswordAsync(user.Id, "Incorrecta999!", "NuevaSegura456!"));
    }

    [Fact]
    public async Task ChangePasswordAsync_ConLaMismaContraseniaDeNuevo_TiraBadRequest()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.ChangePasswordAsync(user.Id, "Correcta123!", "Correcta123!"));
    }

    [Fact]
    public async Task ChangePasswordAsync_ConUnaContraseniaQueNoCumpleLasReglas_TiraBadRequest()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.ChangePasswordAsync(user.Id, "Correcta123!", "corta1"));
    }
}
