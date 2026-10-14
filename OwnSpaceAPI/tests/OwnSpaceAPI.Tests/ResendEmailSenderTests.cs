using System.Net;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class ResendEmailSenderTests
{
    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Mensajes { get; } = [];

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => null!;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Mensajes.Add(formatter(state, exception));
    }

    // Responde siempre lo mismo, sin salir a la red.
    private sealed class RespuestaFija(HttpStatusCode status, string cuerpo) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(status) { Content = new StringContent(cuerpo, Encoding.UTF8, "application/json") });
    }

    private static (ResendEmailSender sender, CapturingLogger<ResendEmailSender> logger) Crear(HttpStatusCode status, string cuerpo)
    {
        var logger = new CapturingLogger<ResendEmailSender>();
        var http = new HttpClient(new RespuestaFija(status, cuerpo)) { BaseAddress = new Uri("https://api.resend.com/") };
        var options = Options.Create(new ResendOptions { ApiKey = "re_test", FromAddress = "onboarding@resend.dev" });
        return (new ResendEmailSender(http, options, logger), logger);
    }

    [Fact]
    public async Task SendAsync_SiResendRechaza_NoLogueaElMensajeConElCorreoDeLaCuenta()
    {
        // Así responde Resend en modo sandbox: el message trae el correo
        // verificado de la cuenta.
        var (sender, logger) = Crear(HttpStatusCode.Forbidden,
            """{"statusCode":403,"message":"You can only send testing emails to your own email address (duena.cuenta@devtch.com).","name":"validation_error"}""");

        await sender.SendAsync("ana.martinez@devtch.com", "Asunto", "Cuerpo con una temporal");

        var mensaje = Assert.Single(logger.Mensajes);
        Assert.DoesNotContain("duena.cuenta@devtch.com", mensaje);
        Assert.DoesNotContain("Cuerpo con una temporal", mensaje);
        Assert.Contains("ana.martinez@devtch.com", mensaje);
        Assert.Contains("403", mensaje);
        Assert.Contains("validation_error", mensaje);
    }

    [Theory]
    [InlineData("no es json")]
    [InlineData("")]
    [InlineData("[1, 2]")]
    [InlineData("""{"message":"sin name"}""")]
    public async Task SendAsync_ConUnCuerpoDeErrorInesperado_IgualLogueaSinRomper(string cuerpo)
    {
        var (sender, logger) = Crear(HttpStatusCode.InternalServerError, cuerpo);

        await sender.SendAsync("ana.martinez@devtch.com", "Asunto", "Cuerpo");

        var mensaje = Assert.Single(logger.Mensajes);
        Assert.Contains("500", mensaje);
        Assert.Contains("sin tipo de error", mensaje);
    }

    [Fact]
    public async Task SendAsync_SiResendAcepta_NoLoguea()
    {
        var (sender, logger) = Crear(HttpStatusCode.OK, """{"id":"abc"}""");

        await sender.SendAsync("ana.martinez@devtch.com", "Asunto", "Cuerpo");

        Assert.Empty(logger.Mensajes);
    }
}
