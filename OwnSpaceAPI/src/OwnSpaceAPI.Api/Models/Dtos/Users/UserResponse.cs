using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Users;

public record UserResponse(Guid Id, string Nombre, string Correo, UserRole Rol, UserStatus Estado)
{
    public static UserResponse FromEntity(User user) =>
        new(user.Id, user.Nombre, user.Correo, user.Rol, user.Estado);
}
