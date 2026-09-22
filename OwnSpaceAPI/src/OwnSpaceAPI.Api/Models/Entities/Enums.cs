using System.Text.Json;
using System.Text.Json.Serialization;

namespace OwnSpaceAPI.Api.Models.Entities;

public enum UserRole
{
    Empleado,
    Administrador,
}

public enum UserStatus
{
    Pendiente,
    Activo,
    Desactivado,
}

// [JsonConverter] explícito porque "Permiso personal" (con espacio, el
// valor que espera docs/openapi.yaml y el frontend) no es un nombre de
// enum de C# válido — el JsonStringEnumConverter global (Program.cs)
// serializaría esto como "PermisoPersonal" sin este converter, rompiendo
// el contrato. Mismo mapeo que el HasConversion manual de AppDbContext
// para la columna de la base, pero es un mecanismo aparte: ese resuelve
// el valor en SQL, este resuelve el valor en el JSON de la API.
[JsonConverter(typeof(RequestTypeJsonConverter))]
public enum RequestType
{
    Emergencia,
    Enfermedad,
    PermisoPersonal,
    Vacaciones,
    Otro,
}

public sealed class RequestTypeJsonConverter : JsonConverter<RequestType>
{
    public override RequestType Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (value == "Permiso personal")
        {
            return RequestType.PermisoPersonal;
        }

        // TryParse en vez de Parse: un valor inválido acá antes tiraba
        // ArgumentException, que el formatter de entrada no reconoce
        // como error de deserialización — terminaba como 500 en vez de
        // 400. JsonException sí la reconoce automáticamente.
        if (value is not null && Enum.TryParse<RequestType>(value, out var parsed))
        {
            return parsed;
        }

        throw new JsonException($"Tipo de solicitud inválido: '{value}'.");
    }

    public override void Write(Utf8JsonWriter writer, RequestType value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value == RequestType.PermisoPersonal ? "Permiso personal" : value.ToString());
    }
}

public enum RequestStatus
{
    Pendiente,
    Aprobada,
    Denegada,
}

// Acciones privilegiadas que deja registro en AuditLog — ver
// Services/Audit/AuditLogService.cs. Cerrado a propósito (enum, no
// string libre): agregar una acción nueva es una decisión explícita de
// código, no algo que un caller pueda inventar sobre la marcha.
public enum AuditAction
{
    UsuarioCreado,
    UsuarioEditado,
    ContrasenaReseteada,
    EstadoUsuarioCambiado,
    SolicitudAprobada,
    SolicitudDenegada,
}

public enum AuditEntityType
{
    Usuario,
    Solicitud,
}

// El converter de TimeOnly que trae System.Text.Json por defecto solo
// acepta el formato ISO completo "HH:mm:ss" — un <input type="time"> de
// HTML manda "HH:mm" (sin segundos), que el converter default rechaza
// con 400. TimeOnly.TryParse es más permisivo (acepta ambos), así que
// se usa acá en vez de confiar en el converter implícito.
public sealed class TimeOnlyJsonConverter : JsonConverter<TimeOnly>
{
    private const string Format = "HH\\:mm";

    public override TimeOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (value is not null
            && TimeOnly.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, out var parsed))
        {
            return parsed;
        }

        throw new JsonException($"Hora inválida: '{value}'.");
    }

    public override void Write(Utf8JsonWriter writer, TimeOnly value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString(Format, System.Globalization.CultureInfo.InvariantCulture));
    }
}
