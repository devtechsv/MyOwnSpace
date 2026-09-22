import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { LeaveRequest, RequestType } from '@/contracts/interfaces/request';

export type EmployeeRequestsTipoFilter = RequestType | 'Todos';

export function useEmployeeRequests() {
  const session = useSession();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<EmployeeRequestsTipoFilter>('Todos');
  // '' = sin filtro; si no, fecha "YYYY-MM-DD" (mismo formato que
  // fechaInicio/fechaFin y que devuelve un <input type="date">).
  const [fechaFiltro, setFechaFiltro] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await API.requests.listByEmployee(session.userId);
      setRequests(data);
    } catch {
      setError('No pudimos cargar tus solicitudes. Intenta de nuevo.');
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

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (tipoFiltro !== 'Todos' && r.tipo !== tipoFiltro) return false;
      if (
        fechaFiltro &&
        !(r.fechaInicio.slice(0, 10) <= fechaFiltro && fechaFiltro <= r.fechaFin.slice(0, 10))
      ) {
        return false;
      }
      return true;
    });
  }, [requests, tipoFiltro, fechaFiltro]);

  return {
    requests: filteredRequests,
    isLoading,
    error,
    reload: load,
    tipoFiltro,
    setTipoFiltro,
    fechaFiltro,
    setFechaFiltro,
  };
}
