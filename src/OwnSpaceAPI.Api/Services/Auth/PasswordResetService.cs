using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Auth;

public sealed class PasswordResetService : IPasswordResetService
{
  private readonly AppDbContext _db;
  private readonly IPasswordHashingService _passwordHasher;
  private readonly IEmailSender _emailSender;

  public PasswordResetService(AppDbContext db, IPasswordHashingService passwordHasher, IEmailSender emailSender)
  {
    _db = db;
    _passwordHasher = passwordHasher;
    _emailSender = emailSender;
  }

  public async Task IssueTemporaryPasswordAsync(string correo)
  {
    var correoNormalizado = correo.Trim().ToLowerInvariant();
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Correo == correoNormalizado);

    if (user is null || user.Estado == UserStatus.Desactivado)
    {
      return; // nunca revela si el correo existe o si está desactivado (SPEC.md §9)
    }

    var temporal = GenerateTemporaryPassword();
    user.PasswordHash = _passwordHasher.Hash(user, temporal);
    user.MustChangePassword = true;
    // Con una contraseña temporal real ya puede loguearse — a diferencia
    // del viejo flujo por token, acá no hace falta un paso intermedio
    // para "terminar" la invitación.
    user.Estado = UserStatus.Activo;
    // Invalida cualquier sesión vieja, mismo criterio que un cambio de
    // contraseña normal.
    user.SecurityStamp = Guid.NewGuid().ToString("N");
    user.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();

    await _emailSender.SendAsync(
        user.Correo,
        "Tu contraseña temporal — MyOwnSpace",
        $"Tu contraseña temporal es: {temporal}\n\n" +
        "Usala para iniciar sesión — el sistema te va a pedir que definas una nueva apenas entres.");
  }

  // Genera una contraseña que ya cumple PasswordRules (mayúscula,
  // minúscula, número, especial, 10+ caracteres) para no depender de
  // que el usuario la valide — no tiene sentido mandar una temporal que
  // el propio sistema rechazaría si alguien la reingresara.
  private static string GenerateTemporaryPassword()
  {
    const string Uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin I/O: se confunden visualmente
    const string Lowers = "abcdefghijkmnpqrstuvwxyz";
    const string Digits = "23456789";
    const string Specials = "!@#$%&*?";
    const string All = Uppers + Lowers + Digits + Specials;
    const int Length = 12;

    var chars = new List<char>
    {
      Uppers[RandomNumberGenerator.GetInt32(Uppers.Length)],
      Lowers[RandomNumberGenerator.GetInt32(Lowers.Length)],
      Digits[RandomNumberGenerator.GetInt32(Digits.Length)],
      Specials[RandomNumberGenerator.GetInt32(Specials.Length)],
    };
    while (chars.Count < Length)
    {
      chars.Add(All[RandomNumberGenerator.GetInt32(All.Length)]);
    }

    // Fisher-Yates: sin esto, las 4 categorías garantizadas quedarían
    // siempre en las primeras 4 posiciones.
    for (var i = chars.Count - 1; i > 0; i--)
    {
      var j = RandomNumberGenerator.GetInt32(i + 1);
      (chars[i], chars[j]) = (chars[j], chars[i]);
    }

    return new string(chars.ToArray());
  }
}
