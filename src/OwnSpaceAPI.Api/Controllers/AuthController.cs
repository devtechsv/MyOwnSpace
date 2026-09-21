using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using OwnSpaceAPI.Api.Models.Dtos.Auth;
using OwnSpaceAPI.Api.Models.Entities;
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

  public AuthController(
    IAuthService authService,
    IJwtTokenService jwtTokenService,
    IPasswordResetService passwordResetService)
  {
    _authService = authService;
    _jwtTokenService = jwtTokenService;
    _passwordResetService = passwordResetService;
  }

  [HttpPost("login")]
  [AllowAnonymous]
  [EnableRateLimiting("auth")]
  public async Task<ActionResult<SessionResponse>> Login(LoginRequest request)
  {
    var user = await _authService.ValidateCredentialsAsync(request.Correo, request.Password);

    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado, user.SecurityStamp);
    SetAccessTokenCookie(token);

    return Ok(new SessionResponse(user.Id, user.Nombre, user.Rol, user.Estado));
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

    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado, user.SecurityStamp);
    SetAccessTokenCookie(token);

    return Ok(new SessionResponse(user.Id, user.Nombre, user.Rol, user.Estado));
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
    await _passwordResetService.RequestResetAsync(request.Correo);
    return Ok();
  }

  [HttpPost("set-password")]
  [AllowAnonymous]
  [EnableRateLimiting("auth")]
  public async Task<IActionResult> SetPassword(SetPasswordRequest request)
  {
    await _passwordResetService.SetPasswordAsync(request.Token, request.NuevaPassword);
    return Ok();
  }

  [HttpPost("change-password")]
  [Authorize]
  public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await _authService.ChangePasswordAsync(userId, request.PasswordActual, request.PasswordNueva);

    // Cambiar la contraseña regenera el securityStamp (invalida otras
    // sesiones) — hay que reemitir el token para que ESTA sesión, la
    // que acaba de hacer el cambio, no quede deslogueada de rebote.
    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado, user.SecurityStamp);
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
      Expires = DateTimeOffset.UtcNow.AddHours(2),
    });
  }

  private void DeleteAccessTokenCookie()
  {
    // Delete necesita los mismos atributos (HttpOnly/Secure/SameSite)
    // que Append: si no coinciden, algunos navegadores no la borran y
    // la cookie vieja queda pegada.
    Response.Cookies.Delete(AccessTokenCookie, new CookieOptions
    {
      HttpOnly = true,
      Secure = true,
      SameSite = SameSiteMode.Lax,
      Path = "/",
    });
  }
}