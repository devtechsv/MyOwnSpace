using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Auth;

public sealed class PasswordResetService : IPasswordResetService
{
  private const int MaxSolicitudesPorVentana = 3;
  private static readonly TimeSpan VentanaSolicitudes = TimeSpan.FromHours(1);
  private static readonly TimeSpan VigenciaTemporal = TimeSpan.FromHours(48);

  // Usuario de relleno para hashear igual cuando no se emite nada (correo
  // inexistente, desactivado o sobre el límite): así el tiempo de
  // respuesta no distingue esos casos de uno real. Mismo criterio que
  // DummyUser en AuthService.
  private static readonly User DummyUser = new() { Nombre = "-", Correo = "-" };

  private readonly AppDbContext _db;
  private readonly IPasswordHashingService _passwordHasher;
  private readonly IEmailSender _emailSender;

  public PasswordResetService(AppDbContext db, IPasswordHashingService passwordHasher, IEmailSender emailSender)
  {
    _db = db;
    _passwordHasher = passwordHasher;
    _emailSender = emailSender;
  }

  public async Task RequestTemporaryPasswordAsync(string correo)
  {
    var correoNormalizado = correo.Trim().ToLowerInvariant();
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Correo == correoNormalizado);
    var ahora = DateTime.UtcNow;

    var temporal = GenerateTemporaryPassword();

    // Nunca revelar si el correo existe, si se encuentra desactivado o si sucedió el límite
    // en los tres casos se hashea igual y se sale sin enviar nada.

    if (user is null || user.Estado == UserStatus.Desactivado || !ConsumirCupo(user, ahora))
    {
      _passwordHasher.Hash(DummyUser, temporal);
      if (user is not null)
      {
        await _db.SaveChangesAsync();
      }
      return;
    }

    // No toca PasswordHash ni SecurityStamp: pedir una temporal no puede
    // dejar a nadie sin su contraseña ni cerrarle las sesiones. Solo se
    // vuelve definitiva si alguien entra con ella (AuthService).
    user.TempPasswordHash = _passwordHasher.Hash(user, temporal);
    user.TempPasswordExpiresAt = ahora.Add(VigenciaTemporal);
    // Un Pendiente no tiene contraseña que perder: con la temporal ya
    // puede entrar, igual que con la invitación.
    if (user.Estado == UserStatus.Pendiente)
    {
      user.Estado = UserStatus.Activo;
    }
    user.UpdatedAt = ahora;
    await _db.SaveChangesAsync();

    await _emailSender.SendAsync(
        user.Correo,
        "Tu contraseña temporal — MyOwnSpace",
        $"Tu contraseña temporal es: {temporal}\n\n" +
        "Úsala para iniciar sesión — el sistema te va a pedir que definas una nueva apenas entres. " +
        "Si no la pediste, ignora este correo: tu contraseña actual sigue funcionando.");
  }
  // Ventana fija de 1 hora por usuario. Devuelve false si ya se emitieron
  // MaxSolicitudesPorVentana temporales en la ventana actual.
  private static bool ConsumirCupo(User user, DateTime ahora)
  {
    if (user.ForgotPasswordWindowStart is null || ahora - user.ForgotPasswordWindowStart >= VentanaSolicitudes)
    {
      user.ForgotPasswordWindowStart = ahora;
      user.ForgotPasswordCount = 0;
    }

    if (user.ForgotPasswordCount >= MaxSolicitudesPorVentana)
    {
      return false;
    }

    user.ForgotPasswordCount++;
    return true;
  }



  public async Task IssueTemporaryPasswordAsync(string correo, string? temporal = null)
  {
    var correoNormalizado = correo.Trim().ToLowerInvariant();
    var user = await _db.Users.FirstOrDefaultAsync(u => u.Correo == correoNormalizado);

    if (user is null || user.Estado == UserStatus.Desactivado)
    {
      return; // nunca revela si el correo existe o si está desactivado (SPEC.md §9)
    }

    temporal ??= GenerateTemporaryPassword();
    user.PasswordHash = _passwordHasher.Hash(user, temporal);
    user.MustChangePassword = true;
    // 48h: suficiente para que llegue el fin de semana sin bloquear a
    // nadie, sin dejarla utilizable indefinidamente si nadie la usa.
    user.TempPasswordExpiresAt = DateTime.UtcNow.Add(VigenciaTemporal);
    // La del admin reemplaza a cualquier temporal pedida antes por el
    // flujo anónimo — no pueden quedar dos temporales válidas a la vez.
    user.TempPasswordHash = null;
    // Con una contraseña temporal real ya puede loguearse — a diferencia
    // del viejo flujo por token, aquí no hace falta un paso intermedio
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
        "Úsala para iniciar sesión — el sistema te va a pedir que definas una nueva apenas entres.");
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
