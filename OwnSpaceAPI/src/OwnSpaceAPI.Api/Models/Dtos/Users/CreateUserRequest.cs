using System.ComponentModel.DataAnnotations;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Users;

public record CreateUserRequest(
    [Required] string Nombre,
    [Required, EmailAddress] string Correo,
    [Required] UserRole Rol);
