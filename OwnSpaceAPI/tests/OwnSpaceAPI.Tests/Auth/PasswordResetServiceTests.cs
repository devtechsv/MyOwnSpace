using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Auth;

namespace OwnSpaceAPI.Tests.Auth;

public class PasswordResetServiceTests
{
    private sealed class FakeEmailSender : IEmailSender
    {
        public string? UltimoDestinatario { get; private set; }
        public string? UltimoCuerpo { get; private set; }

        public Task SendAsync(string destinatario, string asunto, string cuerpo)
        {
            UltimoDestinatario = destinatario;
            UltimoCuerpo = cuerpo;
            return Task.CompletedTask;
        }
    }

    private static AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    // La temporal es la última "palabra" de la última línea del cuerpo
    // del correo (ver el formato armado en PasswordResetService).
    private static string ExtraerTemporal(string cuerpoDelCorreo) =>
        cuerpoDelCorreo.Split('\n')[0].Split(": ").Last();

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
    public async Task IssueTemporaryPasswordAsync_ConCorreoInexistente_NoEnviaCorreo()
    {
        await using var db = CreateContext();
        var emailSender = new FakeEmailSender();
        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);

        await service.IssueTemporaryPasswordAsync("no-existe@devtch.com");

        Assert.Null(emailSender.UltimoDestinatario);
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_ConCorreoDesactivado_NoEnviaCorreoNiLoReactiva()
    {
        // Nunca revela si el correo existe o si está desactivado
        // (SPEC.md §9) — se queda callado en los dos casos.
        await using var db = CreateContext();
        var user = CrearUsuario("Marta Gómez", "marta.gomez@devtch.com", estado: UserStatus.Desactivado);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var emailSender = new FakeEmailSender();
        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);

        await service.IssueTemporaryPasswordAsync("marta.gomez@devtch.com");

        Assert.Null(emailSender.UltimoDestinatario);
        var sinCambios = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal(UserStatus.Desactivado, sinCambios.Estado);
        Assert.Null(sinCambios.PasswordHash);
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_ConTemporalIndicada_UsaEsaYLaEnviaPorCorreo()
    {
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com", estado: UserStatus.Pendiente);
        user.PasswordHash = null;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.IssueTemporaryPasswordAsync("sofia.nunez@devtch.com", "Manual#2026x");

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);

        Assert.Equal("Manual#2026x", ExtraerTemporal(emailSender.UltimoCuerpo!));
        Assert.True(hasher.Verify(actualizado, actualizado.PasswordHash!, "Manual#2026x"));
        Assert.True(actualizado.MustChangePassword);
        Assert.Equal(UserStatus.Activo, actualizado.Estado);
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_DejaAlUsuarioActivoConLaTemporalYMustChangePassword()
    {
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com", estado: UserStatus.Pendiente);
        user.PasswordHash = null;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.IssueTemporaryPasswordAsync("sofia.nunez@devtch.com");

        var temporal = ExtraerTemporal(emailSender.UltimoCuerpo!);
        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);

        Assert.Equal(UserStatus.Activo, actualizado.Estado);
        Assert.True(actualizado.MustChangePassword);
        Assert.True(hasher.Verify(actualizado, actualizado.PasswordHash!, temporal));
        Assert.Equal("sofia.nunez@devtch.com", emailSender.UltimoDestinatario);
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_LaTemporalGeneradaCumpleLasReglasDeContraseña()
    {
        // La temporal no le sirve a nadie si el propio sistema la
        // rechazaría al reingresarla — repetido varias veces porque es
        // generada al azar (Fisher-Yates sobre categorías garantizadas).
        await using var db = CreateContext();
        var emailSender = new FakeEmailSender();
        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);

        for (var i = 0; i < 20; i++)
        {
            var user = CrearUsuario($"Usuario {i}", $"usuario{i}@devtch.com");
            db.Users.Add(user);
            await db.SaveChangesAsync();

            await service.IssueTemporaryPasswordAsync(user.Correo);
            var temporal = ExtraerTemporal(emailSender.UltimoCuerpo!);

            Assert.True(PasswordRules.IsValid(temporal), $"La temporal '{temporal}' no cumple las reglas.");
        }
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_DejaLaTemporalConVencimientoA48Horas()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var antes = DateTime.UtcNow;
        var service = new PasswordResetService(db, new PasswordHashingService(), new FakeEmailSender());
        await service.IssueTemporaryPasswordAsync("ana.martinez@devtch.com");
        var despues = DateTime.UtcNow;

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.NotNull(actualizado.TempPasswordExpiresAt);
        Assert.InRange(actualizado.TempPasswordExpiresAt!.Value, antes.AddHours(48), despues.AddHours(48));
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_RotaElSecurityStamp()
    {
        // Invalida cualquier sesión vieja — mismo criterio que un cambio
        // de contraseña normal.
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
        var stampOriginal = user.SecurityStamp;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, new PasswordHashingService(), new FakeEmailSender());
        await service.IssueTemporaryPasswordAsync("carlos.rivas@devtch.com");

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.NotEqual(stampOriginal, actualizado.SecurityStamp);
    }

    // --- Flujo anónimo (forgot-password): RequestTemporaryPasswordAsync ---

    [Fact]
    public async Task RequestTemporaryPasswordAsync_NoTocaLaContraseñaNiElStamp_YGuardaLaTemporalAparte()
    {
        // El ataque reproducido en vivo: pedir una temporal con solo el
        // correo le quitaba la contraseña a la víctima y le cerraba las sesiones.
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
        user.PasswordHash = hasher.Hash(user, "DeSiempre#2026");
        var hashOriginal = user.PasswordHash;
        var stampOriginal = user.SecurityStamp;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.RequestTemporaryPasswordAsync("carlos.rivas@devtch.com");

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        var temporal = ExtraerTemporal(emailSender.UltimoCuerpo!);
        Assert.Equal(hashOriginal, actualizado.PasswordHash);
        Assert.Equal(stampOriginal, actualizado.SecurityStamp);
        Assert.False(actualizado.MustChangePassword);
        Assert.True(hasher.Verify(actualizado, actualizado.TempPasswordHash!, temporal));
        Assert.NotNull(actualizado.TempPasswordExpiresAt);
    }

    [Fact]
    public async Task RequestTemporaryPasswordAsync_PasadoElLimiteDe3PorHora_NoEnviaMas()
    {
        await using var db = CreateContext();
        var emailSender = new FakeEmailSender();
        var user = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
        db.Users.Add(user);
        await db.SaveChangesAsync();
        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);

        for (var i = 0; i < 3; i++)
        {
            await service.RequestTemporaryPasswordAsync("ana.martinez@devtch.com");
        }
        var terceraTemporal = emailSender.UltimoCuerpo;
        await service.RequestTemporaryPasswordAsync("ana.martinez@devtch.com");

        Assert.Equal(terceraTemporal, emailSender.UltimoCuerpo);
        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal(3, actualizado.ForgotPasswordCount);
    }

    [Fact]
    public async Task RequestTemporaryPasswordAsync_ConLaVentanaVencida_VuelveAPermitir()
    {
        await using var db = CreateContext();
        var emailSender = new FakeEmailSender();
        var user = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
        user.ForgotPasswordWindowStart = DateTime.UtcNow.AddHours(-2);
        user.ForgotPasswordCount = 3;
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);
        await service.RequestTemporaryPasswordAsync("ana.martinez@devtch.com");

        Assert.Equal("ana.martinez@devtch.com", emailSender.UltimoDestinatario);
        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal(1, actualizado.ForgotPasswordCount);
    }

    [Fact]
    public async Task RequestTemporaryPasswordAsync_ConCorreoInexistenteODesactivado_NoEnviaNada()
    {
        await using var db = CreateContext();
        var emailSender = new FakeEmailSender();
        db.Users.Add(CrearUsuario("Marta Gómez", "marta.gomez@devtch.com", estado: UserStatus.Desactivado));
        await db.SaveChangesAsync();
        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);

        await service.RequestTemporaryPasswordAsync("no-existe@devtch.com");
        await service.RequestTemporaryPasswordAsync("marta.gomez@devtch.com");

        Assert.Null(emailSender.UltimoDestinatario);
        var marta = await db.Users.SingleAsync();
        Assert.Equal(UserStatus.Desactivado, marta.Estado);
        Assert.Null(marta.TempPasswordHash);
    }

    [Fact]
    public async Task RequestTemporaryPasswordAsync_ConUsuarioPendiente_LoDejaActivoParaQuePuedaEntrar()
    {
        await using var db = CreateContext();
        var user = CrearUsuario("Sofía Nuñez", "sofia.nunez@devtch.com", estado: UserStatus.Pendiente);
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, new PasswordHashingService(), new FakeEmailSender());
        await service.RequestTemporaryPasswordAsync("sofia.nunez@devtch.com");

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal(UserStatus.Activo, actualizado.Estado);
        Assert.NotNull(actualizado.TempPasswordHash);
    }

    [Fact]
    public async Task IssueTemporaryPasswordAsync_DescartaUnaTemporalAnonimaPendiente()
    {
        // El reset del admin manda: no pueden quedar dos temporales válidas.
        await using var db = CreateContext();
        var user = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
        user.TempPasswordHash = "hash-de-una-temporal-anonima";
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, new PasswordHashingService(), new FakeEmailSender());
        await service.IssueTemporaryPasswordAsync("carlos.rivas@devtch.com");

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Null(actualizado.TempPasswordHash);
    }
}
