namespace OwnSpaceAPI.Api.Models.Entities;

public class User
{
    public Guid Id { get; set; }
    public required string Nombre { get; set; }
    public required string Correo { get; set; }
    public string? PasswordHash { get; set; }
    public UserRole Rol { get; set; }
    public UserStatus Estado { get; set; }
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<LeaveRequest> Solicitudes { get; set; } = new List<LeaveRequest>();
}