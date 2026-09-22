using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;

public record LoginRequest(
    [Required, EmailAddress] string Correo,
    [Required, MaxLength(200)] string Password);
