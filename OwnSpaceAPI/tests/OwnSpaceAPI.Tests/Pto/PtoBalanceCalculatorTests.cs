using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Tests.Pto;

public class PtoBalanceCalculatorTests
{
    [Fact]
    public void ContarQuincenasCompletadas_UnMesCompleto_Cuenta2Cortes()
    {
        var quincenas = PtoBalanceCalculator.ContarQuincenasCompletadas(
            new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 31));

        Assert.Equal(2, quincenas);
    }

    [Fact]
    public void ContarQuincenasCompletadas_AntesDelPrimerCorte_Cuenta0()
    {
        var quincenas = PtoBalanceCalculator.ContarQuincenasCompletadas(
            new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 14));

        Assert.Equal(0, quincenas);
    }

    [Fact]
    public void ContarQuincenasCompletadas_JustoEnElCorte_LoCuenta()
    {
        var quincenas = PtoBalanceCalculator.ContarQuincenasCompletadas(
            new DateOnly(2026, 1, 1), new DateOnly(2026, 1, 15));

        Assert.Equal(1, quincenas);
    }

    [Fact]
    public void ContarQuincenasCompletadas_ConFinAnteriorAInicio_Devuelve0()
    {
        var quincenas = PtoBalanceCalculator.ContarQuincenasCompletadas(
            new DateOnly(2026, 3, 1), new DateOnly(2026, 1, 1));

        Assert.Equal(0, quincenas);
    }

    [Fact]
    public void CalcularHorasAcumuladas_ConIngresoAntesDeEnero_CuentaDesdeElPrimeroDeEnero()
    {
        var horas = PtoBalanceCalculator.CalcularHorasAcumuladas(
            fechaIngreso: new DateOnly(2020, 1, 1),
            fechaDesactivacion: null,
            hoy: new DateOnly(2026, 1, 31));

        // Devengo arranca el 1-ene-2026 (no en 2020) — 2 cortes en enero.
        Assert.Equal(10m, horas);
    }

    [Fact]
    public void CalcularHorasAcumuladas_ConIngresoAMitadDeAño_CuentaSoloDesdeElIngreso()
    {
        var horas = PtoBalanceCalculator.CalcularHorasAcumuladas(
            fechaIngreso: new DateOnly(2026, 6, 20),
            fechaDesactivacion: null,
            hoy: new DateOnly(2026, 7, 31));

        // Devengo arranca el 20-jun (no el 1-ene) — cortes dentro de
        // [20-jun, 31-jul]: 30-jun, 15-jul, 31-jul = 3.
        Assert.Equal(15m, horas);
    }

    [Fact]
    public void CalcularHorasAcumuladas_ConDesactivacion_NoCuentaQuincenasPosteriores()
    {
        var horas = PtoBalanceCalculator.CalcularHorasAcumuladas(
            fechaIngreso: new DateOnly(2020, 1, 1),
            fechaDesactivacion: new DateOnly(2026, 1, 20),
            hoy: new DateOnly(2026, 3, 31));

        // Aunque "hoy" sea marzo, el devengo se congeló el 20-ene — solo
        // el corte del 15-ene entra (dentro de [1-ene, 20-ene]).
        Assert.Equal(5m, horas);
    }
}
