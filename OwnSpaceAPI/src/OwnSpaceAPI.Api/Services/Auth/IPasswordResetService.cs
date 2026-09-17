namespace OwnSpaceAPI.Api.Services.Auth;

public interface IPasswordResetService
{
    Task RequestResetAsync(string correo);
    Task SetPasswordAsync(string token, string nuevaPassword);
}