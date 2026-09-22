import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '@/services/api-services';
import { LeaveRequest } from '@/contracts/interfaces/request';
import { getInitials } from '@/helpers/get-initials';

export interface PtoRow extends LeaveRequest {
  employeeName: string;
  employeeInitials: string;
}

const PAGE_SIZE = 15;

function mesActual(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}`;
}

export function useAdminPto() {
  const [rows, setRows] = useState<PtoRow[]>([]);
  const [nombreQuery, setNombreQuery] = useState('');
  // Default al mes actual — sin esto, la tabla crece sin límite a medida
  // que se acumulan meses de reservas. "" (input vacío) muestra todos.
  const [mesFiltro, setMesFiltro] = useState(mesActual());
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [items, users] = await Promise.all([
        API.pto.listCalendario(),
        API.users.list(),
      ]);
      const userById = new Map(users.map((u) => [u.id, u]));
      const enriched = items.map((request) => {
        const nombre = userById.get(request.employeeId)?.nombre ?? 'Empleado';
        return {
          ...request,
          employeeName: nombre,
          employeeInitials: getInitials(nombre),
        };
      });
      setRows(enriched);
    } catch {
      setError('No pudimos cargar el PTO del equipo. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // setPage(1) al cambiar cualquier filtro, para no quedar en una página
  // que dejó de existir — se hace acá (no en un efecto aparte) para no
  // sumar otro fetch-en-efecto solo para resetear un número.
  const updateNombreQuery = useCallback((value: string) => {
    setNombreQuery(value);
    setPage(1);
  }, []);

  const updateMesFiltro = useCallback((value: string) => {
    setMesFiltro(value);
    setPage(1);
  }, []);

  const filteredRows = useMemo(() => {
    const query = nombreQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const coincideNombre = !query || r.employeeName.toLowerCase().includes(query);
      const coincideMes = !mesFiltro || r.fechaInicio.startsWith(mesFiltro);
      return coincideNombre && coincideMes;
    });
  }, [rows, nombreQuery, mesFiltro]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginaEfectiva = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice(
    (paginaEfectiva - 1) * PAGE_SIZE,
    paginaEfectiva * PAGE_SIZE,
  );

  return {
    rows: pagedRows,
    totalCount: filteredRows.length,
    page: paginaEfectiva,
    totalPages,
    setPage,
    isLoading,
    error,
    nombreQuery,
    setNombreQuery: updateNombreQuery,
    mesFiltro,
    setMesFiltro: updateMesFiltro,
    reload: load,
  };
}
