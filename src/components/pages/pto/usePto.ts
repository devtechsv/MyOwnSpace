import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { LeaveRequest } from '@/contracts/interfaces/request';

export function usePto() {
  const session = useSession();
  const [balance, setBalance] = useState(0);
  const [reservas, setReservas] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      // No hay un "listar mis reservas de PTO" dedicado — se reutiliza
      // /requests/mine filtrando por tipo=Vacaciones server-side (ya
      // paginado) y por estado=Aprobada acá (ListMineAsync no filtra por
      // estado). pageSize generoso a propósito: ningún empleado real
      // acumula más de 100 reservas de Vacaciones en su historial.
      const [balanceResult, vacaciones] = await Promise.all([
        API.pto.getBalance(session.userId),
        API.requests.listByEmployee(session.userId, { tipo: 'Vacaciones', page: 1, pageSize: 100 }),
      ]);
      setBalance(balanceResult.horasDisponibles);
      setReservas(vacaciones.items.filter((r) => r.estado === 'Aprobada'));
    } catch {
      setError('No pudimos cargar tu PTO. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { balance, reservas, isLoading, error, reload: load };
}
