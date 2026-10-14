import { useCallback, useEffect, useState } from 'react';
import API from '@/services/api-services';
import { errorMessage } from '@/helpers/error-message';
import { AuditAction, AuditLog } from '@/contracts/interfaces/audit';

export type AdminAuditAccionFilter = AuditAction | 'Todas';

const PAGE_SIZE = 20;

export function useAdminAudit() {
  const [entradas, setEntradas] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [accionFiltro, setAccionFiltroRaw] = useState<AdminAuditAccionFilter>('Todas');
  // '' = sin filtro; si no, "YYYY-MM-DD" (lo que devuelve un <input type="date">).
  const [desde, setDesdeRaw] = useState('');
  const [hasta, setHastaRaw] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cambiar un filtro vuelve a la página 1, para no quedar en una página
  // que dejó de existir con el filtro nuevo.
  const setAccionFiltro = useCallback((value: AdminAuditAccionFilter) => {
    setAccionFiltroRaw(value);
    setPage(1);
  }, []);

  const setDesde = useCallback((value: string) => {
    setDesdeRaw(value);
    setPage(1);
  }, []);

  const setHasta = useCallback((value: string) => {
    setHastaRaw(value);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await API.audit.list({
        accion: accionFiltro === 'Todas' ? undefined : accionFiltro,
        desde: desde || undefined,
        hasta: hasta || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setEntradas(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      // P. ej. "hasta" anterior a "desde": el motivo del servidor sirve más.
      setError(errorMessage(err, 'No pudimos cargar la auditoría. Intenta de nuevo.'));
    } finally {
      setIsLoading(false);
    }
  }, [accionFiltro, desde, hasta, page]);

  useEffect(() => {
    // Mismo patrón de fetch-en-efecto que useAdminRequests.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return {
    entradas,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    setPage,
    isLoading,
    error,
    accionFiltro,
    setAccionFiltro,
    desde,
    setDesde,
    hasta,
    setHasta,
  };
}
