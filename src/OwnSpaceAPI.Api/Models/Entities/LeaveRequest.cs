namespace OwnSpaceAPI.Api.Models.Entities;

public class LeaveRequest
{
    public Guid Id { get; set; }

    public Guid EmployeeId { get; set; }
    public User Employee { get; set; } = null!;

    public RequestType Tipo { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }
    public required string Motivo { get; set; }
    public RequestStatus Estado { get; set; }
    public DateTime CreatedAt { get; set; }

    public Guid? ReviewedBy { get; set; }
    public User? Reviewer { get; set; }
    public DateTime? ReviewedAt { get; set; }
}
