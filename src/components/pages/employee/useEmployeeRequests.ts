import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { LeaveRequest } from '@/contracts/interfaces/request';

export function useEmployeeRequests() {
  const session = useSession();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await API.requests.listByEmployee(session.userId);
      setRequests(data);
    } catch {
      setError('No pudimos cargar tus solicitudes. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // load() dispara setState propio (loading/error/data) — patrón de
    // fetch-en-efecto estándar de este proyecto, sin librería de
    // data-fetching. La regla no distingue setState sync de async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { requests, isLoading, error, reload: load };
}
