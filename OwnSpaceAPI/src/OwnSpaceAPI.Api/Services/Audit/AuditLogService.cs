using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services.Audit;

public sealed class AuditLogService : IAuditLogService
{
    private const int MaxPageSize = 100;
    private const string ActorDesconocido = "(usuario eliminado)";

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
        // PK, y solo en acciones de admin (no son hot path).
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

    public async Task<PagedResult<AuditLog>> ListarAsync(int page, int pageSize)
    {
        var paginaSegura = Math.Max(1, page);
        var tamañoSeguro = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.AuditLogs.OrderByDescending(a => a.CreatedAt);
        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((paginaSegura - 1) * tamañoSeguro)
            .Take(tamañoSeguro)
            .ToListAsync();

        return new PagedResult<AuditLog>(items, totalCount, paginaSegura, tamañoSeguro);
    }
}
