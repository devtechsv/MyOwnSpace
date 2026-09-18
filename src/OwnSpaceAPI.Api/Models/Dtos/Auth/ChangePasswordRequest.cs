using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;

public record ChangePasswordRequest(
    [Required] string PasswordActual,
    [Required] string PasswordNueva);
