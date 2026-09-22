using System.ComponentModel.DataAnnotations;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Users;

public record CreateUserRequest(
    [Required, MaxLength(200)] string Nombre,
    [Required, EmailAddress, MaxLength(256)] string Correo,
    // Nullable a propósito: sobre un enum no-nullable, [Required] no
    // detecta que el campo faltaba — cae en el primer valor del enum
    // (Empleado) en silencio. Con UserRole? sí lo rechaza.
    [Required] UserRole? Rol,
    [Required] DateOnly FechaIngreso);