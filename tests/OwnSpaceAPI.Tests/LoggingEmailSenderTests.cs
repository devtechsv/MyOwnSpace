using Microsoft.Extensions.Logging;
using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class LoggingEmailSenderTests
{
    // Fake mínimo de ILogger<T> para capturar el mensaje formateado, sin
    // agregar una dependencia (Moq/NSubstitute) solo para este test.
    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public string? LastMessage { get; private set; }

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => null!;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            LastMessage = formatter(state, exception);
        }
    }

    [Fact]
    public async Task SendAsync_LogueaDestinatarioAsuntoYCuerpo()
    {
        var logger = new CapturingLogger<LoggingEmailSender>();
        var sender = new LoggingEmailSender(logger);

        await sender.SendAsync("empleado@devtch.com", "Bienvenido a MyOwnSpace", "Definí tu contraseña.");

        Assert.NotNull(logger.LastMessage);
        Assert.Contains("empleado@devtch.com", logger.LastMessage);
        Assert.Contains("Bienvenido a MyOwnSpace", logger.LastMessage);
        Assert.Contains("Definí tu contraseña.", logger.LastMessage);
    }
}
