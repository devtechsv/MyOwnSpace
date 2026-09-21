using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
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

    private sealed class FakeHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    private static readonly string DevEmailsPath = Path.Combine(AppContext.BaseDirectory, "dev-emails.log");

    [Fact]
    public async Task SendAsync_NuncaLogueaElCuerpo()
    {
        var logger = new CapturingLogger<LoggingEmailSender>();
        var sender = new LoggingEmailSender(logger, new FakeHostEnvironment { EnvironmentName = Environments.Production });

        await sender.SendAsync("empleado@devtch.com", "Bienvenido a MyOwnSpace", "token-secreto-123");

        Assert.NotNull(logger.LastMessage);
        Assert.Contains("empleado@devtch.com", logger.LastMessage);
        Assert.Contains("Bienvenido a MyOwnSpace", logger.LastMessage);
        Assert.DoesNotContain("token-secreto-123", logger.LastMessage);
    }

    [Fact]
    public async Task SendAsync_EnDevelopment_EscribeElCuerpoCompletoAUnArchivoLocal()
    {
        var logger = new CapturingLogger<LoggingEmailSender>();
        var sender = new LoggingEmailSender(logger, new FakeHostEnvironment { EnvironmentName = Environments.Development });
        var antes = File.Exists(DevEmailsPath) ? await File.ReadAllTextAsync(DevEmailsPath) : "";

        await sender.SendAsync("empleado@devtch.com", "Bienvenido a MyOwnSpace", "token-secreto-456");

        var contenido = await File.ReadAllTextAsync(DevEmailsPath);
        Assert.Contains("token-secreto-456", contenido[antes.Length..]);
    }

    [Fact]
    public async Task SendAsync_FueraDeDevelopment_NoEscribeArchivoAlguno()
    {
        var logger = new CapturingLogger<LoggingEmailSender>();
        var sender = new LoggingEmailSender(logger, new FakeHostEnvironment { EnvironmentName = Environments.Production });
        var antes = File.Exists(DevEmailsPath) ? await File.ReadAllTextAsync(DevEmailsPath) : "";

        await sender.SendAsync("empleado@devtch.com", "Asunto", "token-que-no-deberia-guardarse-789");

        var despues = File.Exists(DevEmailsPath) ? await File.ReadAllTextAsync(DevEmailsPath) : "";
        Assert.Equal(antes, despues);
    }
}
