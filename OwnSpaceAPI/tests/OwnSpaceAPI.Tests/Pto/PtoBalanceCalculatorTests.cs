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

    [Theory]
    [InlineData("2026-03-09", "2025-03-10")]
    [InlineData("2026-03-10", "2026-03-10")]
    [InlineData("2024-05-01", "2024-03-10")]
    public void InicioPeriodo_EsElUltimoAniversarioDeIngreso(string fecha, string esperado)
    {
        var inicio = PtoBalanceCalculator.InicioPeriodo(new DateOnly(2024, 3, 10), DateOnly.Parse(fecha));

        Assert.Equal(DateOnly.Parse(esperado), inicio);
    }

    [Fact]
    public void CalcularHorasDisponibles_DuranteElPrimerAño_Es0()
    {
        var hoy = new DateOnly(2026, 12, 31);

        var horas = PtoBalanceCalculator.CalcularHorasDisponibles(
            fechaIngreso: new DateOnly(2026, 3, 10), fechaDesactivacion: null, fecha: hoy, hoy: hoy);

        Assert.Equal(0m, horas);
    }

    [Fact]
    public void CalcularHorasEnAcumulacion_DuranteElPrimerAño_CuentaDesdeElIngreso()
    {
        var horas = PtoBalanceCalculator.CalcularHorasEnAcumulacion(
            fechaIngreso: new DateOnly(2026, 3, 10), fechaDesactivacion: null, hoy: new DateOnly(2026, 7, 31));

        // Cortes en [10-mar, 31-jul]: 15 y fin de mes de mar..jul = 10.
        Assert.Equal(50m, horas);
    }

    [Fact]
    public void CalcularHorasDisponibles_AlCumplirElAño_Libera120HorasDelPeriodoAnterior()
    {
        var hoy = new DateOnly(2026, 3, 10);

        var horas = PtoBalanceCalculator.CalcularHorasDisponibles(
            fechaIngreso: new DateOnly(2025, 3, 10), fechaDesactivacion: null, fecha: hoy, hoy: hoy);

        // Periodo anterior [10-mar-2025, 9-mar-2026]: 24 cortes = 15 días.
        Assert.Equal(120m, horas);
    }

    [Fact]
    public void CalcularHorasEnAcumulacion_AlCumplirElAño_ReiniciaParaElPeriodoSiguiente()
    {
        var horas = PtoBalanceCalculator.CalcularHorasEnAcumulacion(
            fechaIngreso: new DateOnly(2025, 3, 10), fechaDesactivacion: null, hoy: new DateOnly(2026, 3, 10));

        Assert.Equal(0m, horas);
    }

    [Fact]
    public void CalcularHorasDisponibles_ParaUnaFechaDelPeriodoSiguiente_SoloCuentaLoGanadoHastaHoy()
    {
        // Reservar después del próximo aniversario usa lo que se está
        // acumulando ahora, no el saldo del periodo vigente.
        var horas = PtoBalanceCalculator.CalcularHorasDisponibles(
            fechaIngreso: new DateOnly(2025, 3, 10),
            fechaDesactivacion: null,
            fecha: new DateOnly(2027, 3, 15),
            hoy: new DateOnly(2026, 7, 31));

        Assert.Equal(50m, horas);
    }

    [Fact]
    public void CalcularHorasDisponibles_ConDesactivacion_NoCuentaQuincenasPosteriores()
    {
        var hoy = new DateOnly(2026, 2, 1);

        var horas = PtoBalanceCalculator.CalcularHorasDisponibles(
            fechaIngreso: new DateOnly(2025, 1, 1),
            fechaDesactivacion: new DateOnly(2025, 1, 20),
            fecha: hoy,
            hoy: hoy);

        // Del periodo anterior solo entra el corte del 15-ene-2025.
        Assert.Equal(5m, horas);
    }
}
