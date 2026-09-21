namespace OwnSpaceAPI.Api.Services;

public interface IEmailSender
{
    Task SendAsync(string destinatario, string asunto, string cuerpo);
}
