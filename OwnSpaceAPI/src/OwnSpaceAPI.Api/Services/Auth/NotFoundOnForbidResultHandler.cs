using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace OwnSpaceAPI.Api.Services.Auth;

// Reemplaza el 403 por defecto de [Authorize(Roles = ...)] por un 404 —
// nunca hay que confirmar que una ruta existe si el usuario autenticado
// no tiene el rol necesario (SPEC.md §9, misma regla que with-auth.tsx
// en el frontend). El caso "sin sesión válida" (Challenged, no
// Forbidden) sigue su curso normal y termina en 401 vía JwtBearer.
public sealed class NotFoundOnForbidResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _defaultHandler = new();

    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Forbidden)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        await _defaultHandler.HandleAsync(next, context, policy, authorizeResult);
    }
}
