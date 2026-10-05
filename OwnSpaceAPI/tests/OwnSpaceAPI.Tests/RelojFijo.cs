namespace OwnSpaceAPI.Tests;

// "Hoy" fijo para los servicios que dependen de la fecha (PTO): los
// tests no pueden depender del día real en que se corren.
public sealed class RelojFijo(DateOnly hoy) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() =>
        new(hoy.ToDateTime(new TimeOnly(12, 0)), TimeSpan.Zero);
}
