using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace OwnSpaceAPI.Api.Services.Exceptions;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
  private readonly ILogger<GlobalExceptionHandler> _logger;

  public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
  {
    _logger = logger;
  }

  public async ValueTask<bool> TryHandleAsync(
    HttpContext httpContext,
    Exception exception,
    CancellationToken cancellationToken)
  {
    if (httpContext.Response.HasStarted)
    {
      // Si el body ya empezó a mandarse (p. ej. streaming parcial) no se
      // puede tocar el status code acá — intentarlo tira una segunda
      // InvalidOperationException que tapa la excepción real en los logs.
      _logger.LogError(exception, "Excepción no controlada después de que la respuesta ya había empezado a enviarse.");
      return false;
    }

    var (status, title) = exception switch
    {
      NotFoundException => (StatusCodes.Status404NotFound, "No encontrado"),
      ConflictException => (StatusCodes.Status409Conflict, "Conflicto"),
      BadRequestException => (StatusCodes.Status400BadRequest, "Solicitud inválida"),
      UnauthorizedException => (StatusCodes.Status401Unauthorized, "No autorizado"),
      _ => (StatusCodes.Status500InternalServerError, "Error interno"),
    };

    // Con 500 nunca hay que exponer los exception-Message.
    // Solo se loguea server-side. Las excepciones 400/404/409 es personalizado, pues su mensaje es seguro de mostrar.
    var detail = status == StatusCodes.Status500InternalServerError
      ? "Ocurrió un error."
      : exception.Message;

    if (status == StatusCodes.Status500InternalServerError)
    {
      _logger.LogError(exception, "Excepción no controlada");
    }

    httpContext.Response.StatusCode = status;

    await httpContext.Response.WriteAsJsonAsync(
    new ProblemDetails
    {
      Status = status,
      Title = title,
      Detail = detail,
    },
     options: (System.Text.Json.JsonSerializerOptions?)null,
     contentType: "application/problem+json",
     cancellationToken);

    return true;
  }
}