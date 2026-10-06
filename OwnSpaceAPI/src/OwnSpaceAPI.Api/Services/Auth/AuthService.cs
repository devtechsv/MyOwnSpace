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

        // Siempre dos verificaciones completas (la contraseña actual y la
        // temporal pedida por "olvidé mi contraseña"), existan o no: así el
        // tiempo de respuesta no revela si hay una temporal pendiente ni
        // cuál de las dos coincidió.
        var passwordOk = _passwordHasher.Verify(
            user ?? DummyUser,
            user?.PasswordHash ?? DummyPasswordHash,
            password);
        var temporalOk = _passwordHasher.Verify(
            user ?? DummyUser,
            user?.TempPasswordHash ?? DummyPasswordHash,
            password);

        var ahora = DateTime.UtcNow;
        var temporalVencida = user?.TempPasswordExpiresAt is not null && user.TempPasswordExpiresAt < ahora;
        var temporalVigente = user?.TempPasswordExpiresAt is not null && !temporalVencida;

        // MustChangePassword con PasswordHash = temporal del admin (o una
        // temporal anónima ya usada): vence igual que antes.
        var principalValida = passwordOk
            && user?.PasswordHash is not null
            && !(user.MustChangePassword && temporalVencida);
        var temporalValida = temporalOk
            && user?.TempPasswordHash is not null
            && temporalVigente;

        if (user is null || user.Estado != UserStatus.Activo || (!principalValida && !temporalValida))
        {
            throw new UnauthorizedException(CredencialesInvalidasMensaje);
        }

        if (principalValida)
        {
            // Recordó su contraseña: la temporal pendiente ya no hace falta.
            if (user.TempPasswordHash is not null)
            {
                user.TempPasswordHash = null;
                if (!user.MustChangePassword)
                {
                    user.TempPasswordExpiresAt = null;
                }
                user.UpdatedAt = ahora;
                await _db.SaveChangesAsync();
            }
            return user;
        }

        // Entró con la temporal: recién ahora reemplaza a la contraseña
        // anterior y cierra las demás sesiones. TempPasswordExpiresAt se
        // conserva: sigue venciendo en la misma fecha si no la cambia.
        user.PasswordHash = user.TempPasswordHash;
        user.TempPasswordHash = null;
        user.MustChangePassword = true;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = ahora;
        await _db.SaveChangesAsync();

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
        user.MustChangePassword = false;
        user.TempPasswordExpiresAt = null;
        user.TempPasswordHash = null;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return user;
    }
}