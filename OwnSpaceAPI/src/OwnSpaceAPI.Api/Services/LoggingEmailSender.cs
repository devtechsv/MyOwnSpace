namespace OwnSpaceAPI.Api.Services;

// Stub: no hay proveedor de correo real conectado todavía (ver SPEC.md
// §11, Open Questions). Loguea el "envío" en vez de mandarlo de verdad,
// para no bloquear el resto del desarrollo. Cuando se decida un proveedor
// real (SMTP/SendGrid/etc.), se agrega una nueva implementación de
// IEmailSender y se cambia el registro en Program.cs — nada que la
// consuma tiene que cambiar.
public sealed class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(string destinatario, string asunto, string cuerpo)
    {
        _logger.LogInformation(
            "[EMAIL STUB] Para: {Destinatario} | Asunto: {Asunto} | Cuerpo: {Cuerpo}",
            destinatario,
            asunto,
            cuerpo);

        return Task.CompletedTask;
    }
}
