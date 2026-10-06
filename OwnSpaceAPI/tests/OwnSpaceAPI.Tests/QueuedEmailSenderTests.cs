using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class QueuedEmailSenderTests
{
    // Falla con el primer correo y registra los demás.
    private sealed class SenderQueFallaUnaVez : IEmailSender
    {
        public List<string> Entregados { get; } = new();
        public TaskCompletionSource SegundoEntregado { get; } = new();
        private bool _yaFallo;

        public Task SendAsync(string destinatario, string asunto, string cuerpo)
        {
            if (!_yaFallo)
            {
                _yaFallo = true;
                throw new HttpRequestException("Resend no responde");
            }
            Entregados.Add(destinatario);
            SegundoEntregado.TrySetResult();
            return Task.CompletedTask;
        }
    }

    [Fact]
    public async Task SendAsync_SoloEncola_YUnFalloDeEntregaNoDetieneLaCola()
    {
        var entrega = new SenderQueFallaUnaVez();
        var services = new ServiceCollection();
        services.AddKeyedSingleton<IEmailSender>(EmailDispatcher.EntregaKey, entrega);
        var provider = services.BuildServiceProvider();

        var queue = new EmailQueue();
        var dispatcher = new EmailDispatcher(
            queue, provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<EmailDispatcher>.Instance);
        var sender = new QueuedEmailSender(queue);

        // Encolar no lanza aunque la entrega vaya a fallar.
        await sender.SendAsync("uno@devtch.com", "Asunto", "Cuerpo");
        await sender.SendAsync("dos@devtch.com", "Asunto", "Cuerpo");

        await dispatcher.StartAsync(CancellationToken.None);
        await entrega.SegundoEntregado.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await dispatcher.StopAsync(CancellationToken.None);

        Assert.Equal(new[] { "dos@devtch.com" }, entrega.Entregados);
    }
}
