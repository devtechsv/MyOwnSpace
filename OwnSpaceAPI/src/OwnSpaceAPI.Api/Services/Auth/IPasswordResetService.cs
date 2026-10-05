namespace OwnSpaceAPI.Api.Services.Auth;

public interface IPasswordResetService
{
    // temporal: la que eligió el admin al crear el usuario; si es null
    // se genera una al azar. Se asume ya validada contra PasswordRules.
    Task IssueTemporaryPasswordAsync(string correo, string? temporal = null);
}
