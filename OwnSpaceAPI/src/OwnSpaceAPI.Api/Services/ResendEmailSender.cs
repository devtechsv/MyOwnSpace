using System.Net.Http.Json;
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
// correo con el que se registró la cuenta — un 4xx acá no siempre es un
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
            // "olvidé mi contraseña"). Nunca loguea el cuerpo (tiene el
            // token) — mismo criterio que LoggingEmailSender.
            var detalle = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Resend rechazó el envío a {Destinatario} ({Status}): {Detalle}",
                destinatario,
                (int)response.StatusCode,
                detalle);
        }
    }
}
