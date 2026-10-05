namespace OwnSpaceAPI.Api.Services.Pto;

// Tramo de quincenas que cubrió un reclamo (ambos extremos inclusive).
public sealed record TramoReclamado(DateOnly CorteDesde, DateOnly CorteHasta);

// Ausencia de día completo aprobada (Enfermedad, Emergencia, etc.):
// descuenta días trabajados para el mínimo del art. 180.
public sealed record Ausencia(DateOnly Desde, DateOnly Hasta);

public sealed record EstadoPto(
    // Ganadas y todavía sin reclamar; las del año anterior se borran el 1-ene.
    decimal HorasAcumuladas,
    decimal HorasReclamadasHabilitadas,
    decimal HorasReclamadasBloqueadas,
    DateOnly FechaProximaHabilitacion,
    int DiasTrabajadosAnioLaboral);

// Fórmula de PTO sin persistencia propia: todo se calcula al vuelo a
// partir del ingreso, los reclamos y las ausencias. Separado de
// PtoBalanceService para poder testear la matemática sin base de datos.
// Reglas (ver docs/guia-tecnica.md):
// - 5h por quincena trabajada (15 días × 8h / 24 quincenas).
// - Lo ganado se acumula; hay que reclamarlo antes del 1-ene siguiente
//   o se pierde. Reclamado, nunca vence.
// - Cada hora pertenece al año laboral (por aniversario de ingreso, art.
//   179) en que se ganó, y se habilita al cerrar ese año — siempre que
//   haya algún año laboral cerrado, igual o posterior, con al menos 200
//   días trabajados (art. 180). Si no, queda bloqueada hasta entonces.
public static class PtoBalanceCalculator
{
    public const decimal HorasPorQuincena = 5m;
    public const decimal HorasPorDia = 8m;
    public const int DiasTrabajadosMinimos = 200;

    public static EstadoPto Calcular(
        DateOnly fechaIngreso,
        DateOnly? fechaDesactivacion,
        DateOnly hoy,
        IReadOnlyCollection<TramoReclamado> reclamos,
        IReadOnlyCollection<Ausencia> ausencias)
    {
        var ultimoCorteReclamado = reclamos.Count == 0 ? (DateOnly?)null : reclamos.Max(r => r.CorteHasta);
        var tramoPendiente = TramoPendiente(fechaIngreso, fechaDesactivacion, hoy, ultimoCorteReclamado);
        var horasAcumuladas = tramoPendiente is { } t ? ContarQuincenasCompletadas(t.Desde, t.Hasta) * HorasPorQuincena : 0m;

        // Años laborales ya cerrados: 0..aniosCerrados-1. El último que
        // cumple el mínimo habilita a todos los anteriores a él.
        var aniosCerrados = IndicePeriodo(fechaIngreso, hoy);
        var ultimoAnioHabilitado = -1;
        for (var anio = 0; anio < aniosCerrados; anio++)
        {
            var (inicio, fin) = LimitesAnioLaboral(fechaIngreso, anio);
            if (DiasTrabajados(inicio, Min(fin, fechaDesactivacion), ausencias) >= DiasTrabajadosMinimos)
            {
                ultimoAnioHabilitado = anio;
            }
        }

        decimal habilitadas = 0m, bloqueadas = 0m;
        foreach (var reclamo in reclamos)
        {
            for (var anio = IndicePeriodo(fechaIngreso, reclamo.CorteDesde); anio <= IndicePeriodo(fechaIngreso, reclamo.CorteHasta); anio++)
            {
                var (inicio, fin) = LimitesAnioLaboral(fechaIngreso, anio);
                var horas = ContarQuincenasCompletadas(Max(inicio, reclamo.CorteDesde), Min(fin, reclamo.CorteHasta)) * HorasPorQuincena;
                if (anio <= ultimoAnioHabilitado)
                {
                    habilitadas += horas;
                }
                else
                {
                    bloqueadas += horas;
                }
            }
        }

        var (inicioActual, _) = LimitesAnioLaboral(fechaIngreso, aniosCerrados);
        var diasTrabajadosActual = DiasTrabajados(inicioActual, Min(hoy, fechaDesactivacion), ausencias);

        return new EstadoPto(
            horasAcumuladas,
            habilitadas,
            bloqueadas,
            fechaIngreso.AddYears(aniosCerrados + 1),
            diasTrabajadosActual);
    }

    // Quincenas ganadas y sin reclamar, solo del año calendario en curso:
    // lo no reclamado de años anteriores ya se perdió (borrado del 1-ene).
    // Null si no hay nada que reclamar.
    public static (DateOnly Desde, DateOnly Hasta)? TramoPendiente(
        DateOnly fechaIngreso, DateOnly? fechaDesactivacion, DateOnly hoy, DateOnly? ultimoCorteReclamado)
    {
        var desde = Max(fechaIngreso, new DateOnly(hoy.Year, 1, 1));
        if (ultimoCorteReclamado is { } ultimo && ultimo.AddDays(1) > desde)
        {
            desde = ultimo.AddDays(1);
        }
        var hasta = Min(hoy, fechaDesactivacion);

        return ContarQuincenasCompletadas(desde, hasta) > 0 ? (desde, hasta) : null;
    }

    // Lunes a viernes dentro de [desde, hasta], ambos inclusive (art. 178:
    // los descansos semanales no cuentan como días de vacaciones).
    public static int ContarDiasHabiles(DateOnly desde, DateOnly hasta)
    {
        var dias = 0;
        for (var dia = desde; dia <= hasta; dia = dia.AddDays(1))
        {
            if (EsDiaHabil(dia))
            {
                dias++;
            }
        }

        return dias;
    }

    public static bool EsDiaHabil(DateOnly dia) =>
        dia.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday);

    // Días hábiles de [inicio, fin] menos los cubiertos por ausencias
    // (contados una sola vez aunque dos ausencias se superpongan).
    public static int DiasTrabajados(DateOnly inicio, DateOnly fin, IEnumerable<Ausencia> ausencias)
    {
        var diasAusente = new HashSet<DateOnly>();
        foreach (var ausencia in ausencias)
        {
            for (var dia = Max(inicio, ausencia.Desde); dia <= Min(fin, ausencia.Hasta); dia = dia.AddDays(1))
            {
                if (EsDiaHabil(dia))
                {
                    diasAusente.Add(dia);
                }
            }
        }

        return ContarDiasHabiles(inicio, fin) - diasAusente.Count;
    }

    // Último aniversario de ingreso en o antes de `fecha` (o el ingreso
    // mismo durante el primer año). AddYears sobre el ingreso, no sobre el
    // inicio anterior: así un ingreso del 29-feb no se corre año a año.
    public static DateOnly InicioPeriodo(DateOnly fechaIngreso, DateOnly fecha) =>
        fechaIngreso.AddYears(IndicePeriodo(fechaIngreso, fecha));

    private static (DateOnly Inicio, DateOnly Fin) LimitesAnioLaboral(DateOnly fechaIngreso, int anio) =>
        (fechaIngreso.AddYears(anio), fechaIngreso.AddYears(anio + 1).AddDays(-1));

    private static int IndicePeriodo(DateOnly fechaIngreso, DateOnly fecha)
    {
        var anios = fecha.Year - fechaIngreso.Year;
        if (fechaIngreso.AddYears(anios) > fecha)
        {
            anios--;
        }

        return Math.Max(0, anios);
    }

    private static DateOnly Max(DateOnly a, DateOnly b) => a > b ? a : b;

    private static DateOnly Min(DateOnly a, DateOnly? b) => b is { } valor && valor < a ? valor : a;

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
