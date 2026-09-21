using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Auth;

public interface IAuthService
{
  // Tira UnauthorizedException con el mismo mensaje genérico tanto para
  // credenciales inválidas como para un usuario Desactivado — nunca hay
  // que confirmar cuál de los dos motivos fue (SPEC.md §9).
  Task<User> ValidateCredentialsAsync(string correo, string password);
  Task<User?> GetActiveUserAsync(Guid id);
  Task InvalidateSessionsAsync(Guid userId);
  Task<User> ChangePasswordAsync(Guid userId, string passwordActual, string passwordNueva);
}
