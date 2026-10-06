namespace OwnSpaceAPI.Api.Services.Auth;

public interface IPasswordResetService
{
    // Flujo anónimo de "olvidé mi contraseña": guarda la temporal aparte
    // (TempPasswordHash) sin tocar la contraseña actual ni las sesiones,
    // con límite de solicitudes por correo. Nunca revela si el correo existe.
    Task RequestTemporaryPasswordAsync(string correo);

    // Reset del admin y alta de usuario: reemplaza la contraseña en el
    // acto y cierra las sesiones. temporal: la que eligió el admin al crear el usuario; si es null
    // se genera una al azar. Se asume ya validada contra PasswordRules.
    Task IssueTemporaryPasswordAsync(string correo, string? temporal = null);
}
