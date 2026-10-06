namespace OwnSpaceAPI.Tests;

// Instante exacto (a diferencia de RelojFijo, que siempre es mediodía UTC
// y por eso cae el mismo día en UTC y en El Salvador): sirve para probar
// los bordes de "hoy" en hora local, p. ej. las 7 p. m. en San Salvador,
// que en UTC ya es el día siguiente.
public sealed class RelojEnInstante(DateTimeOffset instante) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => instante.ToUniversalTime();
}
