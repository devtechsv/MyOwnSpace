using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Users;

public interface IUsersService
{
    Task<List<User>> ListAsync();
    Task<User> CreateAsync(string nombre, string correo, UserRole rol, DateOnly fechaIngreso);
    Task<User> UpdateAsync(Guid id, string? nombre, string? correo, UserRole? rol);    Task ResetPasswordAsync(Guid id);
    Task<User> ToggleStatusAsync(Guid id);
}
