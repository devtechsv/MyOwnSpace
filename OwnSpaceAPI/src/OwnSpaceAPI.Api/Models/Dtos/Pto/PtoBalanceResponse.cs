using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Api.Models.Dtos.Pto;

public record PtoBalanceResponse(
    decimal HorasDisponibles,
    decimal HorasAcumuladas,
    decimal HorasReclamadasBloqueadas,
    DateOnly FechaProximaHabilitacion,
    int DiasTrabajadosAnioLaboral,
    int DiasTrabajadosMinimos,
    DateOnly FechaLimiteReclamo)
{
    public static PtoBalanceResponse FromResumen(PtoResumen r) => new(
        r.HorasDisponibles,
        r.HorasAcumuladas,
        r.HorasReclamadasBloqueadas,
        r.FechaProximaHabilitacion,
        r.DiasTrabajadosAnioLaboral,
        PtoBalanceCalculator.DiasTrabajadosMinimos,
        r.FechaLimiteReclamo);
}
