namespace OwnSpaceAPI.Api.Models.Entities;

// Un "Reclamar" del empleado: pasa a su favor las quincenas ganadas en
// [CorteDesde, CorteHasta]. Guardar el tramo (no solo las horas) permite
// saber a qué año laboral pertenece cada hora, sin importar cuándo se
// reclamó. Nunca se borra: lo reclamado no vence.
public class PtoClaim
{
    public Guid Id { get; set; }

    public Guid EmployeeId { get; set; }
    public User Employee { get; set; } = null!;
    public DateOnly CorteDesde { get; set; }
    public DateOnly CorteHasta { get; set; }
    public decimal Horas { get; set; }
    public DateTime CreatedAt { get; set; }
}
