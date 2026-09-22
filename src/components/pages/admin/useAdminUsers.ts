import { useCallback, useEffect, useState } from 'react';
import API from '@/services/api-services';
import { User, UserStats } from '@/contracts/interfaces/user';

const PAGE_SIZE = 20;
const EMPTY_STATS: UserStats = { total: 0, activos: 0, pendientes: 0 };

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<UserStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 2 requests separados a propósito: la página (con page/pageSize)
      // no alcanza para calcular Total/Activos/Pendientes — esos totales
      // son sobre TODA la tabla, no solo la página actual. Se piden en
      // paralelo, no en cascada.
      const [pageResult, statsResult] = await Promise.all([
        API.users.list(page, PAGE_SIZE),
        API.users.stats(),
      ]);

      // Si la página pedida quedó vacía porque la cantidad total bajó
      // (ej. filtraron o algo cambió entremedio), vuelve a la última
      // página real — mismo criterio que useAdminRequests.
      if (pageResult.items.length === 0 && pageResult.totalCount > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(pageResult.totalCount / PAGE_SIZE)));
        return;
      }

      setUsers(pageResult.items);
      setTotalCount(pageResult.totalCount);
      setStats(statsResult);
    } catch {
      setError('No pudimos cargar los usuarios. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // load() dispara setState propio (loading/error/data) — patrón de
    // fetch-en-efecto estándar de este proyecto, sin librería de
    // data-fetching. La regla no distingue setState sync de async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return {
    users,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    setPage,
    stats,
    isLoading,
    error,
    reload: load,
  };
}
