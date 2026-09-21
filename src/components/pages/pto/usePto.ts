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
      // /requests/mine (ya trae todos los tipos del empleado) y se
      // filtra acá, igual que el resto de la app filtra client-side.
      const [balanceResult, todas] = await Promise.all([
        API.pto.getBalance(session.userId),
        API.requests.listByEmployee(session.userId),
      ]);
      setBalance(balanceResult.horasDisponibles);
      setReservas(
        todas.filter((r) => r.tipo === 'Vacaciones' && r.estado === 'Aprobada'),
      );
    } catch {
      setError('No pudimos cargar tu PTO. Intentá de nuevo.');
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
