using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Auth;
public record ForgotPasswordRequest([Required, EmailAddress] string Correo);