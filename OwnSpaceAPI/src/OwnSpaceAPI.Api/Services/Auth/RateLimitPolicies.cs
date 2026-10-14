namespace OwnSpaceAPI.Api.Services.Auth;

// Nombres de las políticas de límite de intentos (Program.cs, AddRateLimiter).
// Una por endpoint: antes compartían un solo cupo por IP, y en una oficina
// detrás de una sola IP el cambio de contraseña de uno descontaba del login
// de los demás.
public static class RateLimitPolicies
{
    public const string Login = "login";
    public const string ForgotPassword = "forgot-password";
    public const string ChangePassword = "change-password";
}
