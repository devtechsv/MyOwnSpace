using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OwnSpaceAPI.Api.Models.Dtos.Auth;
using OwnSpaceAPI.Api.Services.Auth;

namespace OwnSpaceAPI.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
  private const string AccessTokenCookie = "accessToken";

  private readonly IAuthService _authService;
  private readonly IJwtTokenService _jwtTokenService;
  private readonly IPasswordResetService _passwordResetService;
  // null = cookie host-only (solo la recibe el host de la API). Con un
  // dominio (Auth:CookieDomain, p. ej. "dominio.com") la reciben también
  // sus subdominios: hace falta si el frontend y la API viven en hosts
  // distintos, porque withAuth lee la cookie en el servidor del frontend.
  private readonly string? _cookieDomain;

  public AuthController(
    IAuthService authService,
    IJwtTokenService jwtTokenService,
    IPasswordResetService passwordResetService,
    IConfiguration configuration)
  {
    _authService = authService;
    _jwtTokenService = jwtTokenService;
    _passwordResetService = passwordResetService;
    var cookieDomain = configuration["Auth:CookieDomain"];
    _cookieDomain = string.IsNullOrWhiteSpace(cookieDomain) ? null : cookieDomain.Trim();
  }

  [HttpPost("login")]
  [AllowAnonymous]
  [EnableRateLimiting("auth")]
  public async Task<ActionResult<SessionResponse>> Login(LoginRequest request)
  {
    var user = await _authService.ValidateCredentialsAsync(request.Correo, request.Password);

    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado, user.SecurityStamp, user.MustChangePassword);
    SetAccessTokenCookie(token);

    return Ok(new SessionResponse(user.Id, user.Nombre, user.Rol, user.Estado, user.MustChangePassword));
  }

  [HttpGet("session")]
  [Authorize]
  public async Task<ActionResult<SessionResponse>> GetSession()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // Renovación deslizante: a diferencia de antes, SÍ vuelve a
    // consultar la base en cada renovación — así un usuario desactivado
    // o con el rol cambiado deja de tener sesión válida en su próxima
    // navegación, no recién cuando el token de 2h expire solo.
    var user = await _authService.GetActiveUserAsync(userId);
    if (user is null)
    {
      DeleteAccessTokenCookie();
      return Unauthorized();
    }

    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado, user.SecurityStamp, user.MustChangePassword);
    SetAccessTokenCookie(token);

    return Ok(new SessionResponse(user.Id, user.Nombre, user.Rol, user.Estado, user.MustChangePassword));
  }

  [HttpPost("logout")]
  [Authorize]
  public async Task<IActionResult> Logout()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    // Regenera el securityStamp: cualquier otra sesión/token vivo de
    // este usuario queda inválido de inmediato, no solo la cookie de
    // este navegador.
    await _authService.InvalidateSessionsAsync(userId);

    DeleteAccessTokenCookie();
    return NoContent();
  }

  [HttpPost("forgot-password")]
  [AllowAnonymous]
  [EnableRateLimiting("auth")]
  public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
  {
    await _passwordResetService.RequestTemporaryPasswordAsync(request.Correo);
    return Ok();
  }

  [HttpPost("change-password")]
  [Authorize]
  [EnableRateLimiting("auth")]
  public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await _authService.ChangePasswordAsync(userId, request.PasswordActual, request.PasswordNueva);

    // Cambiar la contraseña regenera el securityStamp (invalida otras
    // sesiones) — hay que reemitir el token para que ESTA sesión, la
    // que acaba de hacer el cambio, no quede deslogueada de rebote (y
    // para que el must_change_password del token, ya en false, se
    // refleje sin esperar a la próxima renovación de /auth/session).
    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado, user.SecurityStamp, user.MustChangePassword);
    SetAccessTokenCookie(token);

    return NoContent();
  }

  private void SetAccessTokenCookie(string token)
  {
    Response.Cookies.Append(AccessTokenCookie, token, new CookieOptions
    {
      HttpOnly = true,
      Secure = true,
      SameSite = SameSiteMode.Lax,
      Path = "/",
      Domain = _cookieDomain,
      Expires = DateTimeOffset.UtcNow.AddHours(2),
    });
  }

  private void DeleteAccessTokenCookie()
  {
    // Delete necesita los mismos atributos (HttpOnly/Secure/SameSite)
    // que Append: si no coinciden, algunos navegadores no la borran y
    // la cookie vieja queda pegada. Con Domain es obligatorio: sin él, el
    // borrado apunta a otra cookie y la sesión sigue viva.
    Response.Cookies.Delete(AccessTokenCookie, new CookieOptions
    {
      HttpOnly = true,
      Secure = true,
      SameSite = SameSiteMode.Lax,
      Path = "/",
      Domain = _cookieDomain,
    });
  }
}