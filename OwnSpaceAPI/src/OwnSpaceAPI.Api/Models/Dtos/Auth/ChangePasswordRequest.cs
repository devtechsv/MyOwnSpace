using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;

public record ChangePasswordRequest(
    [Required, MaxLength(200)] string PasswordActual,
    [Required, MaxLength(200)] string PasswordNueva);
