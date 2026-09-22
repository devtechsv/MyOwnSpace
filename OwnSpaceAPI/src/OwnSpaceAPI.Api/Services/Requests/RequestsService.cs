using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Requests;

public sealed class RequestsService : IRequestsService
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _db;
    private readonly IEmailSender _emailSender;

    public RequestsService(AppDbContext db, IEmailSender emailSender)
    {
        _db = db;
        _emailSender = emailSender;
    }

    public async Task<List<LeaveRequest>> ListMineAsync(Guid employeeId) =>
        await _db.LeaveRequests
            .Include(r => r.Employee)
            .Where(r => r.EmployeeId == employeeId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    // Ordena ascendente a propósito (más vieja primero) — a diferencia
    // de ListAllAsync, acá el objetivo es que el admin atienda primero
    // lo que lleva más tiempo pendiente, no lo más reciente.
    public Task<PagedResult<LeaveRequest>> ListPendingAsync(
        RequestType? tipo, DateOnly? fecha, string? nombre, int page, int pageSize)
    {
        var query = AplicarFiltros(
            _db.LeaveRequests.Include(r => r.Employee).Where(r => r.Estado == RequestStatus.Pendiente),
            tipo, fecha, nombre);

        return PaginarAsync(query.OrderBy(r => r.CreatedAt), page, pageSize);
    }

    public Task<PagedResult<LeaveRequest>> ListAllAsync(
        RequestStatus? estado, RequestType? tipo, DateOnly? fecha, string? nombre, int page, int pageSize)
    {
        var query = _db.LeaveRequests.Include(r => r.Employee).AsQueryable();
        if (estado is not null)
        {
            query = query.Where(r => r.Estado == estado);
        }

        query = AplicarFiltros(query, tipo, fecha, nombre);

        return PaginarAsync(query.OrderByDescending(r => r.CreatedAt), page, pageSize);
    }

    private static IQueryable<LeaveRequest> AplicarFiltros(
        IQueryable<LeaveRequest> query, RequestType? tipo, DateOnly? fecha, string? nombre)
    {
        if (tipo is not null)
        {
            query = query.Where(r => r.Tipo == tipo);
        }

        if (fecha is not null)
        {
            // Coincide si la fecha cae dentro del rango de la solicitud —
            // mismo criterio que el filtro por fecha ya implementado en
            // el frontend (soporta las multi-día, ej. Enfermedad).
            query = query.Where(r => r.FechaInicio <= fecha && fecha <= r.FechaFin);
        }

        if (!string.IsNullOrWhiteSpace(nombre))
        {
            // Join contra Users.Nombre — EF lo traduce a SQL (no trae
            // nada de más a memoria). EF.Functions.Like en vez de
            // .Contains(): ambos generan LIKE '%valor%' contra SQL Server
            // real, pero .Contains() se evalúa con semántica ordinal
            // (case-sensitive) bajo el proveedor InMemory que usan los
            // tests — Like sí es case-insensitive en los dos proveedores,
            // consistente con el collation CI de la base real.
            query = query.Where(r => EF.Functions.Like(r.Employee.Nombre, $"%{nombre}%"));
        }

        return query;
    }

    private static async Task<PagedResult<LeaveRequest>> PaginarAsync(
        IOrderedQueryable<LeaveRequest> query, int page, int pageSize)
    {
        var paginaSegura = Math.Max(1, page);
        var tamañoSeguro = Math.Clamp(pageSize, 1, MaxPageSize);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((paginaSegura - 1) * tamañoSeguro)
            .Take(tamañoSeguro)
            .ToListAsync();

        return new PagedResult<LeaveRequest>(items, totalCount, paginaSegura, tamañoSeguro);
    }

    public async Task<LeaveRequest> CreateAsync(
        Guid employeeId, RequestType tipo, DateOnly fechaInicio, DateOnly fechaFin,
        TimeOnly? horaInicio, TimeOnly? horaFin, string motivo)
    {
        // Vacaciones tiene su propio flujo de autoservicio (POST
        // /pto/requests, ver PtoRequestsService) — nace directo Aprobada
        // y valida contra el balance de PTO. Si este endpoint genérico la
        // aceptara, se podría crear una Vacaciones Pendiente esquivando
        // por completo esa validación de balance.
        if (tipo == RequestType.Vacaciones)
        {
            throw new BadRequestException("Vacaciones se gestiona exclusivamente desde /pto/requests.");
        }

        if (fechaFin < fechaInicio)
        {
            throw new BadRequestException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        if (horaInicio.HasValue != horaFin.HasValue)
        {
            throw new BadRequestException("Si cargás hora de inicio, también hace falta la hora de fin (y viceversa).");
        }

        // Comparar horas solo tiene sentido dentro del mismo día — en un
        // rango de varios días, horaInicio/horaFin describen el inicio del
        // primer día y el fin del último, no un intervalo continuo.
        if (horaInicio.HasValue && horaFin.HasValue && fechaInicio == fechaFin && horaFin <= horaInicio)
        {
            throw new BadRequestException("La hora de fin no puede ser anterior o igual a la hora de inicio.");
        }

        var request = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = employeeId,
            Tipo = tipo,
            FechaInicio = fechaInicio,
            FechaFin = fechaFin,
            HoraInicio = horaInicio,
            HoraFin = horaFin,
            Motivo = motivo,
            Estado = RequestStatus.Pendiente,
            CreatedAt = DateTime.UtcNow,
        };

        _db.LeaveRequests.Add(request);
        await _db.SaveChangesAsync();

        return request;
    }

    public Task<LeaveRequest> ApproveAsync(Guid id, Guid reviewerId) =>
        ReviewAsync(id, reviewerId, RequestStatus.Aprobada, motivoRechazo: null);

    public Task<LeaveRequest> DenyAsync(Guid id, Guid reviewerId, string motivo) =>
        ReviewAsync(id, reviewerId, RequestStatus.Denegada, motivoRechazo: motivo);

    private async Task<LeaveRequest> ReviewAsync(Guid id, Guid reviewerId, RequestStatus nuevoEstado, string? motivoRechazo)
    {
        var request = await _db.LeaveRequests
            .Include(r => r.Employee)
            .FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new NotFoundException($"Solicitud {id} no encontrada.");

        if (request.Estado != RequestStatus.Pendiente)
        {
            throw new ConflictException("La solicitud ya no está Pendiente.");
        }

        request.Estado = nuevoEstado;
        request.ReviewedBy = reviewerId;
        request.ReviewedAt = DateTime.UtcNow;
        request.MotivoRechazo = motivoRechazo;
        await _db.SaveChangesAsync();

        var accionTexto = nuevoEstado == RequestStatus.Aprobada ? "aprobada" : "denegada";
        var cuerpo = nuevoEstado == RequestStatus.Denegada
            ? $"Tu solicitud de {request.Tipo} fue {accionTexto}. Motivo: {motivoRechazo}"
            : $"Tu solicitud de {request.Tipo} fue {accionTexto}.";
        await _emailSender.SendAsync(
            request.Employee.Correo,
            "Actualización de tu solicitud — MyOwnSpace",
            cuerpo);

        return request;
    }
}
