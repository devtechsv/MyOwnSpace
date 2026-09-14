import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { LeaveRequest } from '@/contracts/interfaces/request';
import { getInitials } from '@/helpers/get-initials';

export interface AdminRequestRow extends LeaveRequest {
  employeeName: string;
  employeeInitials: string;
}

export function useAdminRequests() {
  const session = useSession();
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [pending, users] = await Promise.all([
        API.requests.listPending(),
        API.users.list(),
      ]);
      const userById = new Map(users.map((u) => [u.id, u]));
      const enriched = pending.map((request) => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = useCallback(
    async (id: string) => {
      if (!session) return;
      setActioningId(id);
      try {
        await API.requests.approve(id, session.userId);
        setRequests((current) => current.filter((r) => r.id !== id));
      } catch {
        setError('No pudimos aprobar la solicitud. Intentá de nuevo.');
      } finally {
        setActioningId(null);
      }
    },
    [session],
  );

  const deny = useCallback(
    async (id: string) => {
      if (!session) return;
      setActioningId(id);
      try {
        await API.requests.deny(id, session.userId);
        setRequests((current) => current.filter((r) => r.id !== id));
      } catch {
        setError('No pudimos denegar la solicitud. Intentá de nuevo.');
      } finally {
        setActioningId(null);
      }
    },
    [session],
  );

  return {
    requests,
    isLoading,
    error,
    actioningId,
    approve,
    deny,
    reload: load,
  };
}
