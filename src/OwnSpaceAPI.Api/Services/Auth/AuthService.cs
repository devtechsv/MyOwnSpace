using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Auth;

public sealed class AuthService : IAuthService
{
    private const string CredencialesInvalidasMensaje = "Correo o contraseña inválidos.";

    // Usuario y hash de relleno para cuando el correo no existe (o el
    // usuario no tiene contraseña todavía): igual se hace una
    // verificación de hash completa, para que el tiempo de respuesta no
    // distinga "no existe" de "existe pero la contraseña está mal" —
    // sin esto, un correo inexistente respondía notablemente más rápido
    // (se saltaba el hash), permitiendo enumerar cuentas reales por
    // tiempo de respuesta.
    private static readonly User DummyUser = new() { Nombre = "-", Correo = "-" };
    private static readonly string DummyPasswordHash =
        new PasswordHasher<User>().HashPassword(DummyUser, "dummy-password-para-igualar-el-tiempo-de-respuesta");

    private readonly AppDbContext _db;
    private readonly IPasswordHashingService _passwordHasher;

    public AuthService(AppDbContext db, IPasswordHashingService passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<User> ValidateCredentialsAsync(string correo, string password)
    {
        var correoNormalizado = correo.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Correo == correoNormalizado);

        var passwordOk = _passwordHasher.Verify(
            user ?? DummyUser,
            user?.PasswordHash ?? DummyPasswordHash,
            password);

        if (user is null
            || user.Estado != UserStatus.Activo
            || user.PasswordHash is null
            || !passwordOk)
        {
            throw new UnauthorizedException(CredencialesInvalidasMensaje);
        }

        return user;
    }

    public async Task<User?> GetActiveUserAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        return user is not null && user.Estado == UserStatus.Activo ? user : null;
    }

    public async Task InvalidateSessionsAsync(Guid userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user is null)
        {
            return;
        }

        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
    }

    public async Task<User> ChangePasswordAsync(Guid userId, string passwordActual, string passwordNueva)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new UnauthorizedException(CredencialesInvalidasMensaje);

        if (user.PasswordHash is null || !_passwordHasher.Verify(user, user.PasswordHash, passwordActual))
        {
            throw new UnauthorizedException("La contraseña actual es incorrecta.");
        }

        var context = new PasswordRuleContext { PasswordActual = passwordActual };
        if (!PasswordRules.IsValid(passwordNueva, context))
        {
            throw new BadRequestException("La contraseña no cumple los requisitos mínimos.");
        }

        user.PasswordHash = _passwordHasher.Hash(user, passwordNueva);
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return user;
    }
}