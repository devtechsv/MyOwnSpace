using System.Threading.Channels;

namespace OwnSpaceAPI.Api.Services;

public sealed record EmailMessage(string Destinatario, string Asunto, string Cuerpo);

// Cola en memoria entre la petición HTTP y el envío real. Acotada para
// que una ráfaga no crezca sin límite; si se llena, el que encola espera.
// En memoria a propósito: un correo encolado se pierde si la app se
// reinicia antes de enviarlo (el usuario puede volver a pedirlo).
public sealed class EmailQueue
{
    private readonly Channel<EmailMessage> _channel = Channel.CreateBounded<EmailMessage>(
        new BoundedChannelOptions(1000) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });

    public ValueTask EnqueueAsync(EmailMessage message) => _channel.Writer.WriteAsync(message);

    public IAsyncEnumerable<EmailMessage> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}

// Lo que reciben los servicios como IEmailSender: solo encola, así que
// el tiempo de respuesta no depende de Resend (forgot-password no revela
// por tiempo si el correo existe) y una caída de Resend no convierte en
// 500 una acción que ya se guardó (aprobar/denegar, reservar PTO).
public sealed class QueuedEmailSender : IEmailSender
{
    private readonly EmailQueue _queue;

    public QueuedEmailSender(EmailQueue queue)
    {
        _queue = queue;
    }

    public Task SendAsync(string destinatario, string asunto, string cuerpo) =>
        _queue.EnqueueAsync(new EmailMessage(destinatario, asunto, cuerpo)).AsTask();
}

// Saca los correos de la cola y los entrega con el sender real (Resend),
// registrado como servicio con clave EntregaKey. Un fallo de un envío se
// loguea y no detiene la cola.
public sealed class EmailDispatcher : BackgroundService
{
    public const string EntregaKey = "entrega";

    private readonly EmailQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<EmailDispatcher> _logger;

    public EmailDispatcher(EmailQueue queue, IServiceScopeFactory scopeFactory, ILogger<EmailDispatcher> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var message in _queue.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();
                    var sender = scope.ServiceProvider.GetRequiredKeyedService<IEmailSender>(EntregaKey);
                    await sender.SendAsync(message.Destinatario, message.Asunto, message.Cuerpo);
                }
                catch (Exception ex)
                {
                    // Nunca el cuerpo: puede llevar una contraseña temporal.
                    _logger.LogError(ex, "No se pudo enviar el correo a {Destinatario} ({Asunto}).",
                        message.Destinatario, message.Asunto);
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Apagado normal de la aplicación.
        }
    }
}
