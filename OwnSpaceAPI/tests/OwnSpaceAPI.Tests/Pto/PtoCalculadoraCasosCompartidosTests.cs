using System.Text.Json;
using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Tests.Pto;

// Mismos casos que corre el modo simulado del frontend
// (test-data/pto-calculadora-casos.json): si una regla de PTO cambia en un
// solo lado, una de las dos suites falla.
public class PtoCalculadoraCasosCompartidosTests
{
    private sealed record Rango(DateOnly Desde, DateOnly Hasta);

    private sealed record Esperado(
        decimal HorasAcumuladas,
        decimal HorasReclamadasHabilitadas,
        decimal HorasReclamadasBloqueadas,
        DateOnly FechaProximaHabilitacion,
        int DiasTrabajadosAnioLaboral,
        Rango? TramoPendiente);

    private sealed record CasoEstado(
        string Nombre,
        DateOnly FechaIngreso,
        DateOnly? FechaDesactivacion,
        DateOnly Hoy,
        List<Rango> Reclamos,
        List<Rango> Ausencias,
        Esperado Esperado);

    private sealed record CasoDiasHabiles(string Nombre, DateOnly Desde, DateOnly Hasta, int Esperado);

    private sealed record Archivo(List<CasoEstado> Estado, List<CasoDiasHabiles> DiasHabiles);

    private static readonly Archivo Casos = JsonSerializer.Deserialize<Archivo>(
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Pto", "pto-calculadora-casos.json")),
        new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;

    public static IEnumerable<object[]> NombresEstado() => Casos.Estado.Select(c => new object[] { c.Nombre });

    public static IEnumerable<object[]> NombresDiasHabiles() => Casos.DiasHabiles.Select(c => new object[] { c.Nombre });

    [Theory]
    [MemberData(nameof(NombresEstado))]
    public void Calcular_CoincideConElCasoCompartido(string nombre)
    {
        var caso = Casos.Estado.Single(c => c.Nombre == nombre);
        var reclamos = caso.Reclamos.Select(r => new TramoReclamado(r.Desde, r.Hasta)).ToList();
        var ausencias = caso.Ausencias.Select(a => new Ausencia(a.Desde, a.Hasta)).ToList();
        var ultimoCorte = reclamos.Count == 0 ? (DateOnly?)null : reclamos.Max(r => r.CorteHasta);

        var estado = PtoBalanceCalculator.Calcular(caso.FechaIngreso, caso.FechaDesactivacion, caso.Hoy, reclamos, ausencias);
        var tramo = PtoBalanceCalculator.TramoPendiente(caso.FechaIngreso, caso.FechaDesactivacion, caso.Hoy, ultimoCorte);

        var esperado = caso.Esperado;
        Assert.Equal(
            new EstadoPto(esperado.HorasAcumuladas, esperado.HorasReclamadasHabilitadas, esperado.HorasReclamadasBloqueadas,
                esperado.FechaProximaHabilitacion, esperado.DiasTrabajadosAnioLaboral),
            estado);
        Assert.Equal(esperado.TramoPendiente, tramo is { } t ? new Rango(t.Desde, t.Hasta) : null);
    }

    [Theory]
    [MemberData(nameof(NombresDiasHabiles))]
    public void ContarDiasHabiles_CoincideConElCasoCompartido(string nombre)
    {
        var caso = Casos.DiasHabiles.Single(c => c.Nombre == nombre);

        Assert.Equal(caso.Esperado, PtoBalanceCalculator.ContarDiasHabiles(caso.Desde, caso.Hasta));
    }
}
