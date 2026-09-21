using System.Text.Json;
using System.Text.Json.Serialization;

namespace OwnSpaceAPI.Api.Models.Entities;

public enum UserRole
{
    Empleado,
    Administrador,
    SuperAdmin,
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
