using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
  public async Task<ActionResult<SessionResponse>> Login(LoginRequest request)
  {
    var user = await _authService.ValidateCredentialsAsync(request.Correo, request.Password);

    var token = _jwtTokenService.GenerateToken(user.Id, user.Nombre, user.Rol, user.Estado);
    SetAccessTokenCookie(token);

    return Ok(new SessionResponse(user.Id, user.Nombre, user.Rol, user.Estado));
  }

  [HttpGet("session")]
  [Authorize]
  public ActionResult<SessionResponse> GetSession()
  {
    var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var nombre = User.FindFirstValue(OwnSpaceClaimTypes.Nombre)!;
    var rol = Enum.Parse<UserRole>(User.FindFirstValue(ClaimTypes.Role)!);
    var estado = Enum.Parse<UserStatus>(User.FindFirstValue(OwnSpaceClaimTypes.Estado)!);

    // Renovación deslizante (SPEC.md §9): se reemite un token nuevo
    // con los mismos datos y una expiración +2h desde ahora, sin
    // volver a consultar la base — si [Authorize] dejó pasar la
    // request es porque el token todavía era válido.
    var token = _jwtTokenService.GenerateToken(userId, nombre, rol, estado);
    SetAccessTokenCookie(token);

    return Ok(new SessionResponse(userId, nombre, rol, estado));
  }

  [HttpPost("logout")]
  [Authorize]
  public IActionResult Logout()
  {
    Response.Cookies.Delete(AccessTokenCookie, new CookieOptions { Path = "/" });
    return NoContent();
  }

  [HttpPost("forgot-password")]
  [AllowAnonymous]
  public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
  {
    await _passwordResetService.RequestResetAsync(request.Correo);
    return Ok();
  }

  [HttpPost("set-password")]
  [AllowAnonymous]
  public async Task<IActionResult> SetPassword(SetPasswordRequest request)
  {
    await _passwordResetService.SetPasswordAsync(request.Token, request.NuevaPassword);
    return Ok();
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
}
