namespace OwnSpaceAPI.Api.Services.Pto;

public interface IPtoBalanceService
{
  Task<PtoResumen> ObtenerResumenAsync(Guid employeeId);

  // Horas usables ahora: reclamadas y habilitadas, menos las vacaciones
  // aprobadas y las pendientes (que apartan saldo). excluirSolicitudId:
  // al aprobar una pendiente, para no descontarla dos veces.
  Task<decimal> CalcularDisponibleAsync(Guid employeeId, Guid? excluirSolicitudId = null);

  // Reclama todo lo acumulado y no reclamado del año en curso.
  Task<PtoResumen> ReclamarAsync(Guid employeeId);
}

public sealed record PtoResumen(
  decimal HorasDisponibles,
  decimal HorasAcumuladas,
  decimal HorasReclamadasBloqueadas,
  DateOnly FechaProximaHabilitacion,
  int DiasTrabajadosAnioLaboral,
  // Último día para reclamar lo acumulado antes del borrado del 1-ene.
  DateOnly FechaLimiteReclamo);
