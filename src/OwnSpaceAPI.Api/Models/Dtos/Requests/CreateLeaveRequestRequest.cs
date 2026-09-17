using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Requests;

public record CreateLeaveRequestRequest(
    [property: JsonConverter(typeof(RequestTypeJsonConverter))] [Required] RequestType Tipo,
    [Required] DateOnly FechaInicio,
    [Required] DateOnly FechaFin,
    [Required] string Motivo);
