using System.ComponentModel.DataAnnotations;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Requests;

public record CreateLeaveRequestRequest(
    [Required] RequestType Tipo,
    [Required] DateOnly FechaInicio,
    [Required] DateOnly FechaFin,
    [Required] string Motivo);
