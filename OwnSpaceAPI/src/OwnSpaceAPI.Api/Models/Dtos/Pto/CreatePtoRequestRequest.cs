using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Pto;

public record CreatePtoRequestRequest(
    [Required] DateOnly Fecha,
    [Required] decimal Horas);