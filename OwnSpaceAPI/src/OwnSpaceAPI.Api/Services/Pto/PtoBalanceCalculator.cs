namespace OwnSpaceAPI.Api.Services.Pto;

// Fórmula de devengo/balance de PTO, sin persistencia propia — todo se
// calcula al vuelo a partir de FechaIngreso/FechaDesactivacion del
// usuario y la fecha de hoy. Separado de PtoBalanceService para poder
// testear la matemática sin tocar la base de datos.
public static class PtoBalanceCalculator
{
    public const decimal HorasPorQuincena = 5m;

    // Periodos anuales por aniversario de ingreso (art. 177 del Código de
    // Trabajo de El Salvador: 15 días tras un año de trabajo continuo).
    // Lo devengado en un periodo (5h por quincena, 120h por año) se usa
    // en el periodo siguiente — "desfase de un año": el primer año no hay
    // nada disponible, y lo que no se usa se pierde al cerrar el periodo.
    // Todo se calcula al vuelo, sin ningún job programado.

    // Último aniversario de ingreso en o antes de `fecha` (o el ingreso
    // mismo durante el primer año). AddYears sobre el ingreso, no sobre el
    // inicio anterior: así un ingreso del 29-feb no se corre año a año.
    public static DateOnly InicioPeriodo(DateOnly fechaIngreso, DateOnly fecha) =>
        fechaIngreso.AddYears(IndicePeriodo(fechaIngreso, fecha));

    public static DateOnly FinPeriodoExclusivo(DateOnly fechaIngreso, DateOnly fecha) =>
        fechaIngreso.AddYears(IndicePeriodo(fechaIngreso, fecha) + 1);

    // Horas usables en el periodo que contiene `fecha`: lo devengado en
    // el periodo anterior, congelado en hoy o en la desactivación. Que
    // dependa de `fecha` (no solo de hoy) evita reservar días posteriores
    // al próximo aniversario con el saldo del periodo vigente.
    public static decimal CalcularHorasDisponibles(DateOnly fechaIngreso, DateOnly? fechaDesactivacion, DateOnly fecha, DateOnly hoy)
    {
        var indice = IndicePeriodo(fechaIngreso, fecha);
        if (indice == 0)
        {
            return 0m;
        }

        return HorasDevengadas(
            fechaIngreso.AddYears(indice - 1), fechaIngreso.AddYears(indice), fechaDesactivacion, hoy);
    }

    // Lo que se va devengando en el periodo vigente — solo se libera en
    // el próximo aniversario.
    public static decimal CalcularHorasEnAcumulacion(DateOnly fechaIngreso, DateOnly? fechaDesactivacion, DateOnly hoy) =>
        HorasDevengadas(
            InicioPeriodo(fechaIngreso, hoy), FinPeriodoExclusivo(fechaIngreso, hoy), fechaDesactivacion, hoy);

    private static int IndicePeriodo(DateOnly fechaIngreso, DateOnly fecha)
    {
        var anios = fecha.Year - fechaIngreso.Year;
        if (fechaIngreso.AddYears(anios) > fecha)
        {
            anios--;
        }

        return Math.Max(0, anios);
    }

    private static decimal HorasDevengadas(DateOnly inicio, DateOnly finExclusivo, DateOnly? fechaDesactivacion, DateOnly hoy)
    {
        var fin = finExclusivo.AddDays(-1);
        if (hoy < fin)
        {
            fin = hoy;
        }
        if (fechaDesactivacion is { } desactivacion && desactivacion < fin)
        {
            fin = desactivacion;
        }

        return ContarQuincenasCompletadas(inicio, fin) * HorasPorQuincena;
    }

    // Una quincena se considera devengada en su corte: el día 15 de cada
    // mes, y el último día de cada mes. Cuenta los cortes que caen dentro
    // de [inicio, fin] (ambos inclusive).
    public static int ContarQuincenasCompletadas(DateOnly inicio, DateOnly fin)
    {
        if (fin < inicio)
        {
            return 0;
        }

        var contador = 0;
        var cursor = new DateOnly(inicio.Year, inicio.Month, 1);
        while (cursor <= fin)
        {
            var corteMediados = new DateOnly(cursor.Year, cursor.Month, 15);
            var corteFinDeMes = new DateOnly(cursor.Year, cursor.Month, DateTime.DaysInMonth(cursor.Year, cursor.Month));

            if (corteMediados >= inicio && corteMediados <= fin)
            {
                contador++;
            }
            if (corteFinDeMes >= inicio && corteFinDeMes <= fin)
            {
                contador++;
            }

            cursor = cursor.AddMonths(1);
        }

        return contador;
    }
}