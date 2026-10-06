using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Tests;

public class FechaLocalTests
{
    [Theory]
    // 7 p. m. del 6-oct en San Salvador = 1 a. m. del 7-oct en UTC.
    [InlineData("2026-10-07T01:00:00Z", "2026-10-06")]
    // 11:30 p. m. del 31-dic en San Salvador = 5:30 a. m. del 1-ene en UTC.
    [InlineData("2027-01-01T05:30:00Z", "2026-12-31")]
    // Mediodía UTC: el mismo día en los dos.
    [InlineData("2026-10-05T12:00:00Z", "2026-10-05")]
    public void HoyLocal_UsaLaFechaDeElSalvador(string instanteUtc, string esperado)
    {
        var reloj = new RelojEnInstante(DateTimeOffset.Parse(instanteUtc));

        Assert.Equal(DateOnly.Parse(esperado), reloj.HoyLocal());
    }
}
