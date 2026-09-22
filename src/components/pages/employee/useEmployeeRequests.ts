import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { LeaveRequest, RequestType, RequestsListParams } from '@/contracts/interfaces/request';

export type EmployeeRequestsTipoFilter = RequestType | 'Todos';

const PAGE_SIZE = 20;

export function useEmployeeRequests() {
  const session = useSession();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipoFiltro, setTipoFiltroRaw] = useState<EmployeeRequestsTipoFilter>('Todos');
  // '' = sin filtro; si no, fecha "YYYY-MM-DD" (mismo formato que
  // fechaInicio/fechaFin y que devuelve un <input type="date">).
  const [fechaFiltro, setFechaFiltroRaw] = useState('');

  // Cambiar cualquier filtro vuelve a la página 1, para no quedar en
  // una página que dejó de existir con el nuevo filtro aplicado —
  // mismo criterio que useAdminRequests.
  const setTipoFiltro = useCallback((value: EmployeeRequestsTipoFilter) => {
    setTipoFiltroRaw(value);
    setPage(1);
  }, []);

  const setFechaFiltro = useCallback((value: string) => {
    setFechaFiltroRaw(value);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const params: RequestsListParams = {
        tipo: tipoFiltro === 'Todos' ? undefined : tipoFiltro,
        fecha: fechaFiltro || undefined,
        page,
        pageSize: PAGE_SIZE,
      };
      const result = await API.requests.listByEmployee(session.userId, params);

      // Si la página pedida quedó vacía porque la cantidad total bajó,
      // vuelve a la última página real en vez de mostrar un vacío
      // engañoso — mismo criterio que useAdminRequests.
      if (result.items.length === 0 && result.totalCount > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE)));
        return;
      }

      setRequests(result.items);
      setTotalCount(result.totalCount);
    } catch {
      setError('No pudimos cargar tus solicitudes. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [session, tipoFiltro, fechaFiltro, page]);

  useEffect(() => {
    // load() dispara setState propio (loading/error/data) — patrón de
    // fetch-en-efecto estándar de este proyecto, sin librería de
    // data-fetching. La regla no distingue setState sync de async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return {
    requests,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    setPage,
    isLoading,
    error,
    reload: load,
    tipoFiltro,
    setTipoFiltro,
    fechaFiltro,
    setFechaFiltro,
  };
}
