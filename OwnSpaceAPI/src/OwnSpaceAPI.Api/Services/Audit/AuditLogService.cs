using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Audit;

public sealed class AuditLogService : IAuditLogService
{
    private const int MaxPageSize = 100;
    private const string ActorDesconocido = "(usuario eliminado)";
    private const string ActorAnonimo = "(desconocido)";

    private readonly AppDbContext _db;

    public AuditLogService(AppDbContext db)
    {
        _db = db;
    }

    public async Task RegistrarAsync(
        Guid actorId, AuditAction accion, AuditEntityType entidadTipo, Guid entidadId, string? detalle = null)
    {
        // Solo actorId como parámetro (no actorNombre): así los 6 puntos
        // de instrumentación no necesitan threadear el nombre del actor
        // por toda la cadena de llamadas — ya lo tienen los controllers
        // vía el claim del JWT, pero mantener la firma de los servicios
        // de negocio (UsersService/RequestsService) igual que antes,
        // solo con actorId, es más simple que agregar un parámetro más
        // en cada método. El costo es una consulta extra, indexada por
        // PK, en acciones de admin y en cada inicio/cierre de sesión.
        var actorNombre = await _db.Users
            .Where(u => u.Id == actorId)
            .Select(u => u.Nombre)
            .FirstOrDefaultAsync() ?? ActorDesconocido;

        _db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorId = actorId,
            ActorNombre = actorNombre,
            Accion = accion,
            EntidadTipo = entidadTipo,
            EntidadId = entidadId,
            Detalle = detalle,
            CreatedAt = DateTime.UtcNow,
        });
    }

    public async Task RegistrarInicioSesionFallidoAsync(Guid? usuarioId, string motivo)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            ActorId = null,
            ActorNombre = ActorAnonimo,
            Accion = AuditAction.InicioSesionFallido,
            EntidadTipo = AuditEntityType.Usuario,
            EntidadId = usuarioId,
            Detalle = motivo,
            CreatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
    }

    public async Task<PagedResult<AuditLogConEntidad>> ListarAsync(
        AuditAction? accion, DateOnly? desde, DateOnly? hasta, int page, int pageSize)
    {
        if (desde is not null && hasta is not null && hasta < desde)
        {
            throw new BadRequestException("La fecha final no puede ser anterior a la inicial.");
        }

        var paginaSegura = Math.Max(1, page);
        var tamañoSeguro = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.AuditLogs.AsQueryable();
        if (accion is not null)
        {
            query = query.Where(a => a.Accion == accion);
        }
        if (desde is not null)
        {
            var inicio = FechaLocal.InicioDelDiaUtc(desde.Value);
            query = query.Where(a => a.CreatedAt >= inicio);
        }
        if (hasta is not null)
        {
            // Hasta el final de ese día local: menor que la medianoche del siguiente.
            var fin = FechaLocal.InicioDelDiaUtc(hasta.Value.AddDays(1));
            query = query.Where(a => a.CreatedAt < fin);
        }

        var ordenada = query.OrderByDescending(a => a.CreatedAt);
        var totalCount = await ordenada.CountAsync();
        var items = await ordenada
            .Skip((paginaSegura - 1) * tamañoSeguro)
            .Take(tamañoSeguro)
            .ToListAsync();

        var nombres = await NombresDeEntidadesAsync(items);
        var conEntidad = items
            .Select(a => new AuditLogConEntidad(a, a.EntidadId is Guid id ? nombres.GetValueOrDefault((a.EntidadTipo, id)) : null))
            .ToList();

        return new PagedResult<AuditLogConEntidad>(conEntidad, totalCount, paginaSegura, tamañoSeguro);
    }

    // La bitácora solo guarda el Id de lo afectado. Para mostrar "sobre
    // quién" fue la acción: el nombre del usuario, o el del empleado dueño
    // de la solicitud. Es el nombre de hoy (no el de ese momento, a
    // diferencia de ActorNombre) y son a lo sumo dos consultas por página.
    private async Task<Dictionary<(AuditEntityType, Guid), string>> NombresDeEntidadesAsync(List<AuditLog> items)
    {
        var nombres = new Dictionary<(AuditEntityType, Guid), string>();

        var idsUsuarios = IdsDe(items, AuditEntityType.Usuario);
        if (idsUsuarios.Count > 0)
        {
            var usuarios = await _db.Users
                .Where(u => idsUsuarios.Contains(u.Id))
                .Select(u => new { u.Id, u.Nombre })
                .ToListAsync();
            usuarios.ForEach(u => nombres[(AuditEntityType.Usuario, u.Id)] = u.Nombre);
        }

        var idsSolicitudes = IdsDe(items, AuditEntityType.Solicitud);
        if (idsSolicitudes.Count > 0)
        {
            var solicitudes = await _db.LeaveRequests
                .Where(r => idsSolicitudes.Contains(r.Id))
                .Select(r => new { r.Id, r.Employee.Nombre })
                .ToListAsync();
            solicitudes.ForEach(r => nombres[(AuditEntityType.Solicitud, r.Id)] = r.Nombre);
        }

        return nombres;
    }

    private static List<Guid> IdsDe(List<AuditLog> items, AuditEntityType tipo) =>
        items.Where(a => a.EntidadTipo == tipo && a.EntidadId is not null).Select(a => a.EntidadId!.Value).Distinct().ToList();
}
