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
    public async Task ValidateCredentialsAsync_ConTemporalVencida_TiraUnauthorized_AunqueLaContraseniaSeaCorrecta()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Temporal123!");
        user.MustChangePassword = true;
        user.TempPasswordExpiresAt = DateTime.UtcNow.AddHours(-1);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("empleado@devtch.com", "Temporal123!"));
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConTemporalTodaviaVigente_FuncionaNormal()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Temporal123!");
        user.MustChangePassword = true;
        user.TempPasswordExpiresAt = DateTime.UtcNow.AddHours(1);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ValidateCredentialsAsync("empleado@devtch.com", "Temporal123!");

        Assert.Equal(user.Id, resultado.Id);
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
    public async Task ChangePasswordAsync_LimpiaElVencimientoDeLaTemporal()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "empleado@devtch.com", "Temporal123!");
        user.MustChangePassword = true;
        user.TempPasswordExpiresAt = DateTime.UtcNow.AddHours(1);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        await service.ChangePasswordAsync(user.Id, "Temporal123!", "NuevaSegura456!");

        Assert.Null(user.TempPasswordExpiresAt);
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

    // --- Temporal pedida por forgot-password (TempPasswordHash) ---

    private static User ConTemporalPendiente(IPasswordHashingService hasher, User user, string temporal, DateTime vence)
    {
        user.TempPasswordHash = hasher.Hash(user, temporal);
        user.TempPasswordExpiresAt = vence;
        return user;
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConTemporalPendiente_LaContraseniaDeSiempreSigueFuncionando()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = ConTemporalPendiente(hasher,
            CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!"), "Temporal#2026x", DateTime.UtcNow.AddHours(48));
        var stampOriginal = user.SecurityStamp;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ValidateCredentialsAsync("empleado@devtch.com", "Correcta123!");

        // Recordó su contraseña: entra sin cambio forzado y la temporal se descarta.
        Assert.False(resultado.MustChangePassword);
        Assert.Null(resultado.TempPasswordHash);
        Assert.Equal(stampOriginal, resultado.SecurityStamp);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConLaTemporal_LaVuelveDefinitivaYCierraLasOtrasSesiones()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = ConTemporalPendiente(hasher,
            CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!"), "Temporal#2026x", DateTime.UtcNow.AddHours(48));
        var stampOriginal = user.SecurityStamp;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ValidateCredentialsAsync("empleado@devtch.com", "Temporal#2026x");

        Assert.True(resultado.MustChangePassword);
        Assert.Null(resultado.TempPasswordHash);
        Assert.NotEqual(stampOriginal, resultado.SecurityStamp);
        Assert.True(hasher.Verify(resultado, resultado.PasswordHash!, "Temporal#2026x"));
        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("empleado@devtch.com", "Correcta123!"));
    }

    [Fact]
    public async Task ValidateCredentialsAsync_ConLaTemporalVencida_TiraUnauthorized()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = ConTemporalPendiente(hasher,
            CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!"), "Temporal#2026x", DateTime.UtcNow.AddMinutes(-1));
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);

        await Assert.ThrowsAsync<UnauthorizedException>(
            () => service.ValidateCredentialsAsync("empleado@devtch.com", "Temporal#2026x"));
    }

    [Fact]
    public async Task ValidateCredentialsAsync_PendienteSinContraseniaPropia_EntraConLaTemporal()
    {
        // Pendiente que pidió "olvidé mi contraseña": solo tiene la temporal.
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = CrearUsuarioActivo(hasher, "nuevo@devtch.com", "NoImporta123!");
        user.PasswordHash = null;
        ConTemporalPendiente(hasher, user, "Temporal#2026x", DateTime.UtcNow.AddHours(48));
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ValidateCredentialsAsync("nuevo@devtch.com", "Temporal#2026x");

        Assert.True(resultado.MustChangePassword);
        Assert.NotNull(resultado.PasswordHash);
    }

    [Fact]
    public async Task ChangePasswordAsync_DescartaUnaTemporalPendiente()
    {
        var hasher = new PasswordHashingService();
        await using var db = CreateContext();
        var user = ConTemporalPendiente(hasher,
            CrearUsuarioActivo(hasher, "empleado@devtch.com", "Correcta123!"), "Temporal#2026x", DateTime.UtcNow.AddHours(48));
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new AuthService(db, hasher);
        var resultado = await service.ChangePasswordAsync(user.Id, "Correcta123!", "NuevaSegura#2026");

        Assert.Null(resultado.TempPasswordHash);
    }
}
