using System.ComponentModel.DataAnnotations;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Users;

public record UpdateUserRequest(
    [MaxLength(200)] string? Nombre,
    [EmailAddress, MaxLength(256)] string? Correo,
    UserRole? Rol);
