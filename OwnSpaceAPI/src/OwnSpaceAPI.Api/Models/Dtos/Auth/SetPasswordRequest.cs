using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;
public record SetPasswordRequest(
    [Required] string Token,
    [Required] string NuevaPassword);