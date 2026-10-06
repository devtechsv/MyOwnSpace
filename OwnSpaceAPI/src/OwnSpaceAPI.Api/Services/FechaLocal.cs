namespace OwnSpaceAPI.Api.Services;

// "Hoy" de negocio en la hora de El Salvador, no en UTC. Con
// DateOnly.FromDateTime(UtcNow), desde las 6 p. m. hora local el sistema
// ya tomaba el día siguiente: lo acumulado de PTO se perdía 6 horas antes
// del 1-ene, se rechazaba como "pasada" una solicitud que empieza hoy y
// FechaDesactivacion quedaba un día corrida.
public static class FechaLocal
{
    // El Salvador: UTC−6 todo el año, sin horario de verano.
    private static readonly TimeZoneInfo Zona = ResolverZona();

    public static DateOnly HoyLocal(this TimeProvider clock) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), Zona).DateTime);

    private static TimeZoneInfo ResolverZona()
    {
        // ID IANA (Linux/contenedores, y Windows con ICU); si no, el ID de
        // Windows; y si ninguno existe en el host, UTC−6 fijo, que es
        // exactamente lo que usa El Salvador.
        foreach (var id in new[] { "America/El_Salvador", "Central America Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.CreateCustomTimeZone("El Salvador", TimeSpan.FromHours(-6), "El Salvador", "El Salvador");
    }
}
