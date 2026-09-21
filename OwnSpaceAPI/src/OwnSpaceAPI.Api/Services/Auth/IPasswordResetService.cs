namespace OwnSpaceAPI.Api.Services.Auth;

public interface IPasswordResetService
{
    Task IssueTemporaryPasswordAsync(string correo);
}
