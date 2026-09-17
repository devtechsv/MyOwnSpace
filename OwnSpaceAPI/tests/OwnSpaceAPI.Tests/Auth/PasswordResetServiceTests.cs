using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;

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

    private static string ExtraerToken(string cuerpoDelCorreo) => cuerpoDelCorreo.Split(": ").Last();

    [Fact]
    public async Task RequestResetAsync_ConCorreoInexistente_NoCreaTokenNiEnviaCorreo()
    {
        await using var db = CreateContext();
        var emailSender = new FakeEmailSender();
        var service = new PasswordResetService(db, new PasswordHashingService(), emailSender);

        await service.RequestResetAsync("no-existe@devtch.com");

        Assert.Empty(db.PasswordResetTokens);
        Assert.Null(emailSender.UltimoDestinatario);
    }

    [Fact]
    public async Task FlujoCompleto_SolicitarYDefinirNuevaContrasenia_DejaAlUsuarioActivo()
    {
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Sofía Nuñez",
            Correo = "sofia.nunez@devtch.com",
            Rol = UserRole.Empleado,
            Estado = UserStatus.Pendiente,
            PasswordHash = null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.RequestResetAsync("sofia.nunez@devtch.com");

        var token = ExtraerToken(emailSender.UltimoCuerpo!);
        await service.SetPasswordAsync(token, "NuevaValida123!");

        var actualizado = await db.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal(UserStatus.Activo, actualizado.Estado);
        Assert.True(hasher.Verify(actualizado, actualizado.PasswordHash!, "NuevaValida123!"));
    }

    [Fact]
    public async Task SetPasswordAsync_ConTokenInexistente_TiraBadRequest()
    {
        await using var db = CreateContext();
        var service = new PasswordResetService(db, new PasswordHashingService(), new FakeEmailSender());

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.SetPasswordAsync("token-inventado", "NuevaValida123!"));
    }

    [Fact]
    public async Task SetPasswordAsync_ConTokenYaUsado_TiraBadRequest()
    {
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Carlos Rivas",
            Correo = "carlos.rivas@devtch.com",
            Rol = UserRole.Empleado,
            Estado = UserStatus.Activo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.RequestResetAsync("carlos.rivas@devtch.com");
        var token = ExtraerToken(emailSender.UltimoCuerpo!);

        await service.SetPasswordAsync(token, "PrimeraValida123!");

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.SetPasswordAsync(token, "SegundaValida456!"));
    }

    [Fact]
    public async Task SetPasswordAsync_IgualALaContraseniaActual_TiraBadRequest()
    {
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Julio Pérez",
            Correo = "julio.perez@devtch.com",
            Rol = UserRole.Administrador,
            Estado = UserStatus.Activo,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        user.PasswordHash = hasher.Hash(user, "ActualValida123!");
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.RequestResetAsync("julio.perez@devtch.com");
        var token = ExtraerToken(emailSender.UltimoCuerpo!);

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.SetPasswordAsync(token, "ActualValida123!"));
    }

    [Fact]
    public async Task SetPasswordAsync_ConContraseniaQueNoCumpleReglas_TiraBadRequest()
    {
        await using var db = CreateContext();
        var hasher = new PasswordHashingService();
        var emailSender = new FakeEmailSender();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Ana Martínez",
            Correo = "ana.martinez@devtch.com",
            Rol = UserRole.Empleado,
            Estado = UserStatus.Pendiente,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var service = new PasswordResetService(db, hasher, emailSender);
        await service.RequestResetAsync("ana.martinez@devtch.com");
        var token = ExtraerToken(emailSender.UltimoCuerpo!);

        await Assert.ThrowsAsync<BadRequestException>(
            () => service.SetPasswordAsync(token, "corta"));
    }
}