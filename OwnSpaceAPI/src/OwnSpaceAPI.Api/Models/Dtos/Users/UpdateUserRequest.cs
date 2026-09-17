using System.ComponentModel.DataAnnotations;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Users;

public record UpdateUserRequest(
    string? Nombre,
    [EmailAddress] string? Correo,
    UserRole? Rol);
