using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Auth;

public sealed class PasswordResetService : IPasswordResetService
{
  private static readonly TimeSpan TokenLifetime = TimeSpan.FromHours(1);

  private readonly AppDbContext _db;
  private readonly IPasswordHashingService _passwordHasher;
  private readonly IEmailSender _emailSender;

  public PasswordResetService(AppDbContext db, IPasswordHashingService passwordHasher, IEmailSender emailSender)
  {
    _db = db;
    _passwordHasher = passwordHasher;
    _emailSender = emailSender;
  }

  public async Task RequestResetAsync(string correo)
  {
    var correoNormalizado = correo.Trim().ToLowerInvariant();
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Correo == correoNormalizado);

    if (user is null || user.Estado == UserStatus.Desactivado)
    {
      return; // nunca revela si el correo existe o si está desactivado (SPEC.md §9)
    }

    // Sin esto, pedir varios resets seguidos dejaba varios tokens
    // válidos vivos a la vez — cualquiera de ellos (p. ej. uno filtrado
    // desde un correo viejo) seguía sirviendo para tomar la cuenta hasta
    // que expirara por su cuenta.
    var tokensViejos = await _db.PasswordResetTokens
        .Where(t => t.UserId == user.Id && t.UsedAt == null)
        .ToListAsync();
    foreach (var tokenViejo in tokensViejos)
    {
      tokenViejo.UsedAt = DateTime.UtcNow;
    }

    var rawToken = GenerateRawToken();

    _db.PasswordResetTokens.Add(new PasswordResetToken
    {
      Id = Guid.NewGuid(),
      UserId = user.Id,
      TokenHash = HashToken(rawToken),
      ExpiresAt = DateTime.UtcNow.Add(TokenLifetime),
      CreatedAt = DateTime.UtcNow,
    });
    await _db.SaveChangesAsync();

    await _emailSender.SendAsync(
        user.Correo,
        "Recuperá tu contraseña — MyOwnSpace",
        $"Usá este token para definir una nueva contraseña (vence en 1 hora): {rawToken}");
  }

  public async Task SetPasswordAsync(string token, string nuevaPassword)
  {
    var tokenHash = HashToken(token);
    var resetToken = await _db.PasswordResetTokens
        .Include(t => t.User)
        .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);

    if (resetToken is null || resetToken.UsedAt is not null || resetToken.ExpiresAt < DateTime.UtcNow)
    {
      throw new BadRequestException("El enlace no es válido o ya expiró.");
    }

    var user = resetToken.User;

    if (user.Estado == UserStatus.Desactivado)
    {
      // Mismo mensaje que un token inválido — no confirmar el
      // estado de la cuenta a quien tiene el link.
      throw new BadRequestException("El enlace no es válido o ya expiró.");
    }

    if (!PasswordRules.IsValid(nuevaPassword))
    {
      throw new BadRequestException("La contraseña no cumple los requisitos mínimos.");
    }

    if (user.PasswordHash is not null && _passwordHasher.Verify(user, user.PasswordHash, nuevaPassword))
    {
      throw new BadRequestException("La nueva contraseña no puede ser igual a la actual.");
    }

    user.PasswordHash = _passwordHasher.Hash(user, nuevaPassword);
    if (user.Estado == UserStatus.Pendiente)
    {
      user.Estado = UserStatus.Activo;
    }
    user.SecurityStamp = Guid.NewGuid().ToString("N");
    user.UpdatedAt = DateTime.UtcNow;
    resetToken.UsedAt = DateTime.UtcNow;

    await _db.SaveChangesAsync();
  }
  private static string GenerateRawToken()
  {
    var bytes = RandomNumberGenerator.GetBytes(32);
    return Convert.ToBase64String(bytes)
        .Replace('+', '-')
        .Replace('/', '_')
        .TrimEnd('=');
  }

  private static string HashToken(string token)
  {
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
    return Convert.ToHexString(bytes);
  }
}