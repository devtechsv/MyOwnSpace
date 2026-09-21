import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { LeaveRequest, RequestStatus } from '@/contracts/interfaces/request';
import { getInitials } from '@/helpers/get-initials';

export interface AdminRequestRow extends LeaveRequest {
  employeeName: string;
  employeeInitials: string;
}

export type AdminRequestsFilter = 'Pendiente' | RequestStatus | 'Todas';

export function useAdminRequests() {
  const session = useSession();
  const [filtro, setFiltro] = useState<AdminRequestsFilter>('Pendiente');
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [nombreQuery, setNombreQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, users] = await Promise.all([
        filtro === 'Pendiente'
          ? API.requests.listPending()
          : API.requests.listAll(filtro === 'Todas' ? undefined : filtro),
        API.users.list(),
      ]);
      const userById = new Map(users.map((u) => [u.id, u]));
      const enriched = items.map((request) => {
        const user = userById.get(request.employeeId);
        const nombre = user?.nombre ?? 'Empleado';
        return {
          ...request,
          employeeName: nombre,
          employeeInitials: getInitials(nombre),
        };
      });
      setRequests(enriched);
    } catch {
      setError('No pudimos cargar las solicitudes. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    // load() dispara setState propio (loading/error/data) — patrón de
    // fetch-en-efecto estándar de este proyecto, sin librería de
    // data-fetching. La regla no distingue setState sync de async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const applyReviewResult = useCallback(
    (updated: LeaveRequest) => {
      setRequests((current) =>
        filtro === 'Pendiente'
          ? current.filter((r) => r.id !== updated.id)
          : current.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
    },
    [filtro],
  );

  const approve = useCallback(
    async (id: string) => {
      if (!session) return;
      setActioningId(id);
      try {
        const updated = await API.requests.approve(id, session.userId);
        applyReviewResult(updated);
      } catch {
        setError('No pudimos aprobar la solicitud. Intentá de nuevo.');
      } finally {
        setActioningId(null);
      }
    },
    [session, applyReviewResult],
  );

  const deny = useCallback(
    async (id: string, motivo: string) => {
      if (!session) return;
      setActioningId(id);
      try {
        const updated = await API.requests.deny(id, session.userId, motivo);
        applyReviewResult(updated);
      } catch {
        setError('No pudimos denegar la solicitud. Intentá de nuevo.');
      } finally {
        setActioningId(null);
      }
    },
    [session, applyReviewResult],
  );

  const filteredRequests = useMemo(() => {
    const query = nombreQuery.trim().toLowerCase();
    if (!query) return requests;
    return requests.filter((r) => r.employeeName.toLowerCase().includes(query));
  }, [requests, nombreQuery]);

  return {
    requests: filteredRequests,
    // Cuenta total del filtro de estado (tab), sin achicar por el
    // buscador de nombre — así el número en la pestaña activa no
    // cambia mientras se escribe.
    totalCount: requests.length,
    isLoading,
    error,
    actioningId,
    approve,
    deny,
    reload: load,
    filtro,
    setFiltro,
    nombreQuery,
    setNombreQuery,
  };
}
