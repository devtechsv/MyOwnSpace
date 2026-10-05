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

    private static readonly DateOnly Ingreso = new(2026, 5, 10); // ejemplo de MEJORAS.md

    private static EstadoPto Calcular(DateOnly hoy, TramoReclamado[]? reclamos = null, Ausencia[]? ausencias = null, DateOnly? ingreso = null) =>
        PtoBalanceCalculator.Calcular(ingreso ?? Ingreso, null, hoy, reclamos ?? [], ausencias ?? []);

    [Fact]
    public void Acumuladas_SumanCincoHorasPorQuincenaDesdeElIngreso()
    {
        // Cortes en [10-may, 31-dic-2026]: 15 y fin de mes de may..dic = 16.
        Assert.Equal(80m, Calcular(new DateOnly(2026, 12, 31)).HorasAcumuladas);
    }

    [Fact]
    public void Acumuladas_SinReclamar_SeBorranElPrimeroDeEnero()
    {
        Assert.Equal(0m, Calcular(new DateOnly(2027, 1, 10)).HorasAcumuladas);
        Assert.Equal(5m, Calcular(new DateOnly(2027, 1, 15)).HorasAcumuladas);
    }

    [Fact]
    public void Acumuladas_YaReclamadas_NoSeVuelvenAContar()
    {
        var estado = Calcular(new DateOnly(2026, 12, 31), [new(Ingreso, new DateOnly(2026, 12, 31))]);

        Assert.Equal(0m, estado.HorasAcumuladas);
    }

    [Fact]
    public void Reclamadas_DuranteElPrimerAño_QuedanBloqueadasHastaElAniversario()
    {
        var estado = Calcular(new DateOnly(2027, 3, 1), [new(Ingreso, new DateOnly(2026, 12, 31))]);

        Assert.Equal(0m, estado.HorasReclamadasHabilitadas);
        Assert.Equal(80m, estado.HorasReclamadasBloqueadas);
        Assert.Equal(new DateOnly(2027, 5, 10), estado.FechaProximaHabilitacion);
    }

    [Fact]
    public void Reclamadas_AlCumplirElAño_SeHabilitan()
    {
        TramoReclamado[] reclamos =
        [
            new(Ingreso, new DateOnly(2026, 12, 31)),
            new(new DateOnly(2027, 1, 1), new DateOnly(2027, 5, 9)), // 15-ene..30-abr = 8 cortes
        ];

        var estado = Calcular(new DateOnly(2027, 5, 10), reclamos);

        Assert.Equal(120m, estado.HorasReclamadasHabilitadas);
        Assert.Equal(0m, estado.HorasReclamadasBloqueadas);
    }

    [Fact]
    public void Reclamadas_PertenecenAlAñoLaboralEnQueSeGanaron()
    {
        // Un reclamo hecho ya en el 2do año cubre quincenas de los dos:
        // las del 1er año se habilitan, la del 15-may-2027 no.
        TramoReclamado[] reclamos = [new(new DateOnly(2027, 1, 1), new DateOnly(2027, 5, 20))];

        var estado = Calcular(new DateOnly(2027, 5, 20), reclamos);

        Assert.Equal(40m, estado.HorasReclamadasHabilitadas);
        Assert.Equal(5m, estado.HorasReclamadasBloqueadas);
        Assert.Equal(new DateOnly(2028, 5, 10), estado.FechaProximaHabilitacion);
    }

    [Fact]
    public void Reclamadas_ConMenosDe200DiasTrabajados_SiguenBloqueadasHastaUnAñoQueCumpla()
    {
        var ingreso = new DateOnly(2025, 1, 1);
        // 2025 tiene 261 días hábiles; ene..abr son 86 → 175 trabajados.
        Ausencia[] ausencias = [new(new DateOnly(2025, 1, 1), new DateOnly(2025, 4, 30))];
        TramoReclamado[] reclamos =
        [
            new(new DateOnly(2025, 1, 1), new DateOnly(2025, 12, 31)),
            new(new DateOnly(2026, 1, 1), new DateOnly(2026, 12, 31)),
        ];

        var alPrimerAniversario = Calcular(new DateOnly(2026, 1, 5), reclamos[..1], ausencias, ingreso);
        Assert.Equal(0m, alPrimerAniversario.HorasReclamadasHabilitadas);
        Assert.Equal(120m, alPrimerAniversario.HorasReclamadasBloqueadas);

        // El 2do año sí cumple: habilita también lo del 1ro.
        var alSegundoAniversario = Calcular(new DateOnly(2027, 1, 5), reclamos, ausencias, ingreso);
        Assert.Equal(240m, alSegundoAniversario.HorasReclamadasHabilitadas);
        Assert.Equal(0m, alSegundoAniversario.HorasReclamadasBloqueadas);
    }

    [Fact]
    public void ContarDiasHabiles_SoloCuentaDeLunesAViernes()
    {
        // Lunes 5-oct a domingo 11-oct-2026.
        Assert.Equal(5, PtoBalanceCalculator.ContarDiasHabiles(new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 11)));
    }

    [Fact]
    public void DiasTrabajados_NoDescuentaFinesDeSemanaNiDuplicaAusenciasSuperpuestas()
    {
        Ausencia[] ausencias =
        [
            new(new DateOnly(2026, 10, 9), new DateOnly(2026, 10, 12)), // vie..lun
            new(new DateOnly(2026, 10, 12), new DateOnly(2026, 10, 12)), // lun repetido
        ];

        var dias = PtoBalanceCalculator.DiasTrabajados(new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 16), ausencias);

        // 10 hábiles − vie 9 − lun 12 = 8.
        Assert.Equal(8, dias);
    }

    [Fact]
    public void DiasTrabajados_DelAñoLaboralEnCurso_SeInforma()
    {
        // 10-may..15-may-2026: dom 10 no cuenta → lun 11..vie 15 = 5.
        Assert.Equal(5, Calcular(new DateOnly(2026, 5, 15)).DiasTrabajadosAnioLaboral);
    }
}
