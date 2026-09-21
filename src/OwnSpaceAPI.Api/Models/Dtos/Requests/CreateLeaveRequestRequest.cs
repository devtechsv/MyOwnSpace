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
    // Opcionales — una solicitud sin hora sigue siendo de día completo,
    // igual que antes de agregar este campo. La regla de "van juntas o
    // ninguna" se valida en RequestsService, no acá (no es un chequeo de
    // formato de un solo campo).
    [property: JsonConverter(typeof(TimeOnlyJsonConverter))] TimeOnly? HoraInicio,
    [property: JsonConverter(typeof(TimeOnlyJsonConverter))] TimeOnly? HoraFin,
    [Required, MaxLength(1000)] string Motivo);
