using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace OwnSpaceAPI.Api.Services;

public sealed class ResendOptions
{
    public string ApiKey { get; set; } = "";
    public string FromAddress { get; set; } = "";
}

// Envío real vía la API HTTP de Resend (https://resend.com/docs/api-reference/emails/send-email).
// En modo sandbox (sin dominio verificado), Resend solo entrega al
// correo con el que se registró la cuenta — un 4xx aquí no siempre es un
// bug propio, puede ser esa restricción.
public sealed class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly ResendOptions _options;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(HttpClient httpClient, IOptions<ResendOptions> options, ILogger<ResendEmailSender> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    private sealed record ResendEmailPayload(
        [property: JsonPropertyName("from")] string From,
        [property: JsonPropertyName("to")] string[] To,
        [property: JsonPropertyName("subject")] string Subject,
        [property: JsonPropertyName("text")] string Text);

    public async Task SendAsync(string destinatario, string asunto, string cuerpo)
    {
        var payload = new ResendEmailPayload(_options.FromAddress, [destinatario], asunto, cuerpo);

        using var response = await _httpClient.PostAsJsonAsync("emails", payload);

        if (!response.IsSuccessStatusCode)
        {
            // No relanza la excepción: un correo que no salió no debería
            // tumbar el flujo de negocio (el usuario igual puede reintentar
            // "olvidé mi contraseña"). Corre en segundo plano vía
            // EmailDispatcher. Nunca loguea el cuerpo (puede tener una
            // contraseña temporal) — mismo criterio que LoggingEmailSender.
            // Tampoco el cuerpo del error: su "message" puede traer el correo
            // verificado de la cuenta de Resend (p. ej. en modo sandbox). Solo
            // el "name", que es el tipo de error (validation_error, etc.).
            _logger.LogError(
                "Resend rechazó el envío a {Destinatario} ({Status}, {TipoDeError}).",
                destinatario,
                (int)response.StatusCode,
                await LeerTipoDeErrorAsync(response));
        }
    }

    private static async Task<string> LeerTipoDeErrorAsync(HttpResponseMessage response)
    {
        try
        {
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return json.RootElement.ValueKind == JsonValueKind.Object
                && json.RootElement.TryGetProperty("name", out var name)
                && name.ValueKind == JsonValueKind.String
                ? name.GetString()!
                : "sin tipo de error";
        }
        catch (JsonException)
        {
            return "sin tipo de error";
        }
    }
}
