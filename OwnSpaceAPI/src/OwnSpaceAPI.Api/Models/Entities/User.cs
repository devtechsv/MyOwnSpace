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
    // Se prende al emitir una contraseña temporal (invitación, "olvidé mi
    // contraseña", reset de admin) y se apaga en ChangePasswordAsync — el
    // usuario puede loguearse con la temporal, pero no usar el resto de
    // la app hasta elegir una propia (ver el middleware en Program.cs).
    public bool MustChangePassword { get; set; }
    //Cargado por el propio admin cuando se da de alta al empleado - empieza todo
    public DateOnly FechaIngreso { get; set; }
    // Completado al desactivar ToggleStatusAsync y se limpia si en caso se reactiva
    public DateOnly? FechaDesactivacion {get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<LeaveRequest> Solicitudes { get; set; } = new List<LeaveRequest>();
}