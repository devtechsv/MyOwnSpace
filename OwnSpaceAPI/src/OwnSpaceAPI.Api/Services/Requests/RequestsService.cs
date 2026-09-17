using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Requests;

public sealed class RequestsService : IRequestsService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _emailSender;

    public RequestsService(AppDbContext db, IEmailSender emailSender)
    {
        _db = db;
        _emailSender = emailSender;
    }

    public async Task<List<LeaveRequest>> ListMineAsync(Guid employeeId) =>
        await _db.LeaveRequests
            .Where(r => r.EmployeeId == employeeId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

    public async Task<List<LeaveRequest>> ListPendingAsync() =>
        await _db.LeaveRequests
            .Where(r => r.Estado == RequestStatus.Pendiente)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();

    public async Task<LeaveRequest> CreateAsync(
        Guid employeeId, RequestType tipo, DateOnly fechaInicio, DateOnly fechaFin, string motivo)
    {
        if (fechaFin < fechaInicio)
        {
            throw new BadRequestException("La fecha de fin no puede ser anterior a la fecha de inicio.");
        }

        var request = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = employeeId,
            Tipo = tipo,
            FechaInicio = fechaInicio,
            FechaFin = fechaFin,
            Motivo = motivo,
            Estado = RequestStatus.Pendiente,
            CreatedAt = DateTime.UtcNow,
        };

        _db.LeaveRequests.Add(request);
        await _db.SaveChangesAsync();

        return request;
    }

    public Task<LeaveRequest> ApproveAsync(Guid id, Guid reviewerId) =>
        ReviewAsync(id, reviewerId, RequestStatus.Aprobada);

    public Task<LeaveRequest> DenyAsync(Guid id, Guid reviewerId) =>
        ReviewAsync(id, reviewerId, RequestStatus.Denegada);

    private async Task<LeaveRequest> ReviewAsync(Guid id, Guid reviewerId, RequestStatus nuevoEstado)
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
        await _db.SaveChangesAsync();

        var accionTexto = nuevoEstado == RequestStatus.Aprobada ? "aprobada" : "denegada";
        await _emailSender.SendAsync(
            request.Employee.Correo,
            "Actualización de tu solicitud — MyOwnSpace",
            $"Tu solicitud de {request.Tipo} fue {accionTexto}.");

        return request;
    }
}
