namespace OwnSpaceAPI.Api.Services.Pto;

public interface IPtoBalanceService
{
  // Saldo usable en el periodo que contiene `paraFecha` (hoy si es null).
  Task<decimal> CalcularBalanceAsync(Guid employeeId, DateOnly? paraFecha = null);

  Task<PtoBalanceResumen> ObtenerResumenAsync(Guid employeeId);
}

public sealed record PtoBalanceResumen(
  decimal HorasDisponibles,
  // Lo que se devenga en el periodo vigente, usable desde FechaProximoPeriodo.
  decimal HorasEnAcumulacion,
  DateOnly FechaProximoPeriodo);