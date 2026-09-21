namespace OwnSpaceAPI.Api.Models.Entities;

public class LeaveRequest
{
    public Guid Id { get; set; }

    public Guid EmployeeId { get; set; }
    public User Employee { get; set; } = null!;
    public RequestType Tipo { get; set; }
    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }
    // Opcionales: una solicitud sigue siendo válida sin hora (día completo).
    // Cuando se cargan, van siempre juntas (ver validación en RequestsService).
    public TimeOnly? HoraInicio { get; set; }
    public TimeOnly? HoraFin { get; set; }

    // Solo aplica a Tipo = Vacaciones (módulo de PTO): 8 (jornada
    // completa) o el valor personalizado que eligió el empleado. Para
    // el resto de los tipos queda null — no participan del balance de PTO.
    public decimal? HorasSolicitadas { get; set; }
    public required string Motivo { get; set; }
    public RequestStatus Estado { get; set; }
    public DateTime CreatedAt { get; set; }

    public Guid? ReviewedBy { get; set; }
    public User? Reviewer { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? MotivoRechazo { get; set; }
}
