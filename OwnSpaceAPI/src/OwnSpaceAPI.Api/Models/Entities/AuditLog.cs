namespace OwnSpaceAPI.Api.Models.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid ActorId { get; set; }
    // Nombre del actor al momento de la acción — embebido a propósito
    // (mismo criterio que LeaveRequestResponse.EmployeeNombre) para que
    // la bitácora se pueda listar sin JOIN contra Users, y para que siga
    // siendo legible aunque el nombre de ese usuario cambie después.
    public required string ActorNombre { get; set; }
    public AuditAction Accion { get; set; }
    public AuditEntityType EntidadTipo { get; set; }
    public Guid EntidadId { get; set; }
    public string? Detalle { get; set; }
    public DateTime CreatedAt { get; set; }

    public User? Actor { get; set; }
}
