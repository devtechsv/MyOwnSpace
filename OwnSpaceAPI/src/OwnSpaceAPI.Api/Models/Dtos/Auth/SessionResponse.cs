using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;

public record SessionResponse(Guid UserId, string Nombre, UserRole Rol, UserStatus Estado);
