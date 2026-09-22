namespace OwnSpaceAPI.Api.Services.Pto;

// Fórmula de devengo/balance de PTO, sin persistencia propia — todo se
// calcula al vuelo a partir de FechaIngreso/FechaDesactivacion del
// usuario y la fecha de hoy. Separado de PtoBalanceService para poder
// testear la matemática sin tocar la base de datos.
public static class PtoBalanceCalculator
{
    public const decimal HorasPorQuincena = 5m;

    // El devengo arranca en la fecha de ingreso o el 1 de enero del año
    // en curso (lo que sea más tarde), y se congela en la fecha de
    // desactivación o en hoy (lo que sea más temprano). Esto implementa
    // tanto "el reinicio anual" como "el contador se detiene al
    // desactivar" sin necesidad de ningún job programado.
    public static decimal CalcularHorasAcumuladas(DateOnly fechaIngreso, DateOnly? fechaDesactivacion, DateOnly hoy)
    {
        var primeroDeEnero = new DateOnly(hoy.Year, 1, 1);
        var inicioDevengo = fechaIngreso > primeroDeEnero ? fechaIngreso : primeroDeEnero;
        var finDevengo = fechaDesactivacion is { } desactivacion && desactivacion < hoy ? desactivacion : hoy;

        return ContarQuincenasCompletadas(inicioDevengo, finDevengo) * HorasPorQuincena;
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