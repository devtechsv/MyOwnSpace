using System.Data;
using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Pto;

public sealed class PtoBalanceService : IPtoBalanceService
{
    private readonly AppDbContext _db;
    private readonly TimeProvider _clock;

    public PtoBalanceService(AppDbContext db, TimeProvider clock)
    {
        _db = db;
        _clock = clock;
    }

    private DateOnly Hoy => DateOnly.FromDateTime(_clock.GetUtcNow().UtcDateTime);

    public async Task<PtoResumen> ObtenerResumenAsync(Guid employeeId)
    {
        var user = await ObtenerUsuarioAsync(employeeId);
        var estado = await CalcularEstadoAsync(user);
        var consumidas = await HorasConsumidasAsync(employeeId, excluirSolicitudId: null);

        return new PtoResumen(
            Math.Max(0, estado.HorasReclamadasHabilitadas - consumidas),
            estado.HorasAcumuladas,
            estado.HorasReclamadasBloqueadas,
            estado.FechaProximaHabilitacion,
            estado.DiasTrabajadosAnioLaboral,
            new DateOnly(Hoy.Year, 12, 31));
    }

    public async Task<decimal> CalcularDisponibleAsync(Guid employeeId, Guid? excluirSolicitudId = null)
    {
        var user = await ObtenerUsuarioAsync(employeeId);
        var estado = await CalcularEstadoAsync(user);
        var consumidas = await HorasConsumidasAsync(employeeId, excluirSolicitudId);

        // Defensivo: en operación normal nunca debería dar negativo (cada
        // reserva se valida contra este saldo), pero no debería poder
        // "mostrar" un saldo negativo si algo cambió después.
        return Math.Max(0, estado.HorasReclamadasHabilitadas - consumidas);
    }

    public async Task<PtoResumen> ReclamarAsync(Guid employeeId)
    {
        // Serializable: leer el último corte reclamado e insertar el nuevo
        // reclamo tiene que ser atómico — un doble click no puede reclamar
        // dos veces las mismas quincenas. El proveedor InMemory (tests) no
        // soporta transacciones, por eso IsRelational().
        using (var transaction = _db.Database.IsRelational()
            ? await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable)
            : null)
        {
            var user = await ObtenerUsuarioAsync(employeeId);
            var ultimoCorte = await _db.PtoClaims
                .Where(c => c.EmployeeId == employeeId)
                .MaxAsync(c => (DateOnly?)c.CorteHasta);

            var tramo = PtoBalanceCalculator.TramoPendiente(user.FechaIngreso, user.FechaDesactivacion, Hoy, ultimoCorte)
                ?? throw new BadRequestException("No tienes horas acumuladas para reclamar.");

            _db.PtoClaims.Add(new PtoClaim
            {
                Id = Guid.NewGuid(),
                EmployeeId = employeeId,
                CorteDesde = tramo.Desde,
                CorteHasta = tramo.Hasta,
                Horas = PtoBalanceCalculator.ContarQuincenasCompletadas(tramo.Desde, tramo.Hasta) * PtoBalanceCalculator.HorasPorQuincena,
                CreatedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            if (transaction is not null)
            {
                await transaction.CommitAsync();
            }
        }

        return await ObtenerResumenAsync(employeeId);
    }

    private async Task<User> ObtenerUsuarioAsync(Guid employeeId) =>
        await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == employeeId)
            ?? throw new NotFoundException($"Usuario {employeeId} no encontrado.");

    private async Task<EstadoPto> CalcularEstadoAsync(User user)
    {
        var reclamos = await _db.PtoClaims.AsNoTracking()
            .Where(c => c.EmployeeId == user.Id)
            .Select(c => new TramoReclamado(c.CorteDesde, c.CorteHasta))
            .ToListAsync();

        // Art. 180: solo las ausencias aprobadas de día completo descuentan
        // días trabajados (un permiso por horas no es un día no trabajado).
        // Las vacaciones no son ausencia: son el derecho mismo.
        var ausencias = await _db.LeaveRequests.AsNoTracking()
            .Where(r => r.EmployeeId == user.Id
                && r.Tipo != RequestType.Vacaciones
                && r.Estado == RequestStatus.Aprobada
                && r.HoraInicio == null)
            .Select(r => new Ausencia(r.FechaInicio, r.FechaFin))
            .ToListAsync();

        return PtoBalanceCalculator.Calcular(user.FechaIngreso, user.FechaDesactivacion, Hoy, reclamos, ausencias);
    }

    // Lo reclamado no vence, así que se descuenta todo el historial — no
    // solo el año en curso. Las pendientes apartan saldo hasta que un admin
    // las resuelva (al denegarse, se liberan solas).
    private async Task<decimal> HorasConsumidasAsync(Guid employeeId, Guid? excluirSolicitudId) =>
        await _db.LeaveRequests
            .Where(r => r.EmployeeId == employeeId
                && r.Tipo == RequestType.Vacaciones
                && (r.Estado == RequestStatus.Aprobada || r.Estado == RequestStatus.Pendiente)
                && r.Id != excluirSolicitudId)
            .SumAsync(r => r.HorasSolicitadas ?? 0);
}
