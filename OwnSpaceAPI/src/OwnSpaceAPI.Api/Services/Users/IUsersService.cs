using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Users;

public sealed record UserStats(int Total, int Activos, int Pendientes);

public interface IUsersService
{
    Task<PagedResult<User>> ListAsync(int page, int pageSize);
    Task<UserStats> GetStatsAsync();
    Task<User> CreateAsync(Guid actorId, string nombre, string correo, UserRole rol, DateOnly fechaIngreso);
    Task<User> UpdateAsync(Guid actorId, Guid id, string? nombre, string? correo, UserRole? rol);
    Task ResetPasswordAsync(Guid actorId, Guid id);
    Task<User> ToggleStatusAsync(Guid actorId, Guid id);
}
