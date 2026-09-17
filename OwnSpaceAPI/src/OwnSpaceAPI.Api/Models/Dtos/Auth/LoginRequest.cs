using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;

public record LoginRequest(
    [Required, EmailAddress] string Correo,
    [Required] string Password);
