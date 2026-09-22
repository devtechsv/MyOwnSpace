using Microsoft.Extensions.Hosting;

namespace OwnSpaceAPI.Api.Services;

// Stub: no hay proveedor de correo real conectado todavía (ver SPEC.md
// §11, Open Questions). El log de la aplicación (ILogger) nunca ve el
// cuerpo del correo — solo destinatario y asunto — para que un token de
// reset nunca quede en texto plano si estos logs algún día viajan a un
// agregador centralizado. El cuerpo completo (con el token) se escribe
// aparte, solo en Development, a un archivo dentro de bin/ (ya
// gitignoreado — no hace falta una entrada nueva en .gitignore).
public sealed class LoggingEmailSender : IEmailSender
{
    private static readonly string DevEmailsFilePath =
        Path.Combine(AppContext.BaseDirectory, "dev-emails.log");

    private readonly ILogger<LoggingEmailSender> _logger;
    private readonly IHostEnvironment _environment;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public async Task SendAsync(string destinatario, string asunto, string cuerpo)
    {
        _logger.LogInformation(
            "[EMAIL STUB] Para: {Destinatario} | Asunto: {Asunto}",
            destinatario,
            asunto);

        if (_environment.IsDevelopment())
        {
            var linea =
                $"{DateTime.UtcNow:O} | Para: {destinatario} | Asunto: {asunto}{Environment.NewLine}" +
                $"{cuerpo}{Environment.NewLine}{new string('-', 40)}{Environment.NewLine}";

            await File.AppendAllTextAsync(DevEmailsFilePath, linea);
        }
    }
}