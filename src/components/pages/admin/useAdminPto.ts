import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // Se guarda también el nombre para seguir mostrando al elegido en la
  // lista aunque no tenga reservas en el mes que se esté viendo.
  const [empleado, setEmpleado] = useState<{ id: string; nombre: string } | null>(null);
  // Default al mes actual — sin esto, la tabla crece sin límite a medida
  // que se acumulan meses de reservas. "" (input vacío) muestra todos.
  const [mesFiltro, setMesFiltro] = useState(mesActual());
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Al cambiar rápido de mes puede llegar primero la respuesta vieja: solo
  // se aplica la del último pedido.
  const ultimoPedido = useRef(0);

  const load = useCallback(async () => {
    const pedido = ++ultimoPedido.current;
    setIsLoading(true);
    setError(null);
    try {
      // El filtro de mes va al servidor (solo viaja ese mes) y cada fila ya
      // trae employeeNombre — antes se descargaba todo el historial más
      // todos los usuarios, admins incluidos, para resolver nombres.
      const items = await API.pto.listCalendario(mesFiltro || undefined);
      if (pedido !== ultimoPedido.current) return;
      const enriched = items.map((request) => {
        const nombre = request.employeeNombre ?? 'Empleado';
        return {
          ...request,
          employeeName: nombre,
          employeeInitials: getInitials(nombre),
        };
      });
      setRows(enriched);
    } catch {
      if (pedido !== ultimoPedido.current) return;
      setError('No pudimos cargar el PTO del equipo. Intenta de nuevo.');
    } finally {
      if (pedido === ultimoPedido.current) setIsLoading(false);
    }
  }, [mesFiltro]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // setPage(1) al cambiar cualquier filtro, para no quedar en una página
  // que dejó de existir — se hace aquí (no en un efecto aparte) para no
  // sumar otro fetch-en-efecto solo para resetear un número.
  // Opciones de la lista: quienes tienen reservas en el mes cargado (no
  // hace falta pedir /users) más el elegido, para que el filtro sobreviva
  // al cambiar de mes — la tabla queda vacía en vez de perder la selección.
  const empleados = useMemo(() => {
    const porId = new Map<string, string>();
    for (const r of rows) porId.set(r.employeeId, r.employeeName);
    if (empleado) porId.set(empleado.id, empleado.nombre);
    return [...porId]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [rows, empleado]);

  const updateEmpleadoFiltro = useCallback(
    (id: string) => {
      const elegido = empleados.find((e) => e.id === id);
      setEmpleado(elegido ?? null);
      setPage(1);
    },
    [empleados],
  );

  const updateMesFiltro = useCallback((value: string) => {
    setMesFiltro(value);
    setPage(1);
  }, []);

  // El mes ya lo filtró el servidor; el empleado se filtra aquí sobre ese
  // mes, por id (dos empleados pueden llamarse igual).
  const filteredRows = useMemo(
    () => (empleado ? rows.filter((r) => r.employeeId === empleado.id) : rows),
    [rows, empleado],
  );

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
    empleados,
    empleadoFiltro: empleado?.id ?? '',
    setEmpleadoFiltro: updateEmpleadoFiltro,
    mesFiltro,
    setMesFiltro: updateMesFiltro,
    reload: load,
  };
}
