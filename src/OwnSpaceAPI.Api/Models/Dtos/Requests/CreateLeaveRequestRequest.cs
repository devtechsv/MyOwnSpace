using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Models.Dtos.Requests;

public record CreateLeaveRequestRequest(
    // Nullable a propósito: sobre un enum no-nullable, [Required] no
    // detecta que el campo faltaba en el JSON — cae en el primer valor
    // del enum (Emergencia) en silencio. Con RequestType? sí lo rechaza.
    [property: JsonConverter(typeof(RequestTypeJsonConverter))] [Required] RequestType? Tipo,
    [Required] DateOnly FechaInicio,
    [Required] DateOnly FechaFin,
    [Required, MaxLength(1000)] string Motivo);
