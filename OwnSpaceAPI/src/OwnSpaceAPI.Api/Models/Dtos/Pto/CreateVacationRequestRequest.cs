using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Pto;

public record CreateVacationRequestRequest(
    [Required] DateOnly FechaInicio,
    [Required] DateOnly FechaFin,
    [MaxLength(1000)] string? Motivo = null);
