using Microsoft.Data.SqlClient;

namespace OwnSpaceAPI.Api.Services.Exceptions;

public static class SqlConcurrencia
{
    // 1205 (deadlock, elegida como víctima) y 1222 (timeout esperando un
    // lock) son el costo esperado de las transacciones Serializable de PTO
    // cuando llegan dos pedidos a la vez del mismo empleado (doble clic, o
    // un script). Hay que traducirlos a un 409 legible en vez de dejar
    // escapar el 500 crudo. EF Core envuelve el SqlException real en un
    // DbUpdateException (si pasó durante SaveChangesAsync) y a veces en un
    // InvalidOperationException encima — por eso se recorre InnerException.
    public static bool EsDeadlockOTimeoutDeLock(Exception ex)
    {
        for (var actual = ex; actual is not null; actual = actual.InnerException)
        {
            if (actual is SqlException sqlEx && sqlEx.Number is 1205 or 1222)
            {
                return true;
            }
        }

        return false;
    }
}
