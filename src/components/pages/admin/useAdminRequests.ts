import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import API from '@/services/api-services';
import { errorMessage } from '@/helpers/error-message';
import {
  LeaveRequest,
  RequestStatus,
  RequestType,
  RequestsListParams,
} from '@/contracts/interfaces/request';
import { getInitials } from '@/helpers/get-initials';

export interface AdminRequestRow extends LeaveRequest {
  employeeName: string;
  employeeInitials: string;
}

export type AdminRequestsFilter = 'Pendiente' | RequestStatus | 'Todas';
export type AdminRequestsTipoFilter = RequestType | 'Todos';

export interface EmpleadoOpcion {
  id: string;
  nombre: string;
}

const PAGE_SIZE = 20;
// Máximo que acepta GET /users por página.
const USERS_PAGE_SIZE = 100;

// Solo los empleados crean solicitudes: los admins no van en la lista.
// Se recorren todas las páginas una vez al abrir el panel.
async function cargarEmpleados(): Promise<EmpleadoOpcion[]> {
  const empleados: EmpleadoOpcion[] = [];
  for (let page = 1; ; page++) {
    const { items, totalCount } = await API.users.list(page, USERS_PAGE_SIZE);
    for (const u of items) {
      if (u.rol !== 'Empleado') continue;
      // Un desactivado puede tener solicitudes viejas: se mantiene en la
      // lista, marcado para no confundirlo con alguien activo.
      const nombre = u.estado === 'Desactivado' ? `${u.nombre} (desactivado)` : u.nombre;
      empleados.push({ id: u.id, nombre });
    }
    if (items.length === 0 || page * USERS_PAGE_SIZE >= totalCount) break;
  }
  return empleados.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function useAdminRequests() {
  const session = useSession();
  const [filtro, setFiltroRaw] = useState<AdminRequestsFilter>('Pendiente');
  const [requests, setRequests] = useState<AdminRequestRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  // '' = todos; si no, el id del empleado (filtro exacto en el backend).
  const [empleadoFiltro, setEmpleadoFiltroRaw] = useState('');
  const [empleados, setEmpleados] = useState<EmpleadoOpcion[]>([]);
  const [tipoFiltro, setTipoFiltroRaw] = useState<AdminRequestsTipoFilter>('Todos');
  // '' = sin filtro; si no, fecha en formato "YYYY-MM-DD" (mismo formato
  // que devuelve un <input type="date"> y que ya usan fechaInicio/fechaFin).
  const [fechaFiltro, setFechaFiltroRaw] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Si falla, la lista queda solo con "Todos los empleados": el resto
  // del panel sigue funcionando.
  useEffect(() => {
    let vigente = true;
    cargarEmpleados()
      .then((lista) => {
        if (vigente) setEmpleados(lista);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  // Cambiar cualquier otro filtro vuelve a la página 1, para no quedar
  // en una página que dejó de existir con el nuevo filtro aplicado.
  const setFiltro = useCallback((value: AdminRequestsFilter) => {
    setFiltroRaw(value);
    setPage(1);
  }, []);

  const setTipoFiltro = useCallback((value: AdminRequestsTipoFilter) => {
    setTipoFiltroRaw(value);
    setPage(1);
  }, []);

  const setFechaFiltro = useCallback((value: string) => {
    setFechaFiltroRaw(value);
    setPage(1);
  }, []);

  const setEmpleadoFiltro = useCallback((value: string) => {
    setEmpleadoFiltroRaw(value);
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: RequestsListParams = {
        tipo: tipoFiltro === 'Todos' ? undefined : tipoFiltro,
        fecha: fechaFiltro || undefined,
        employeeId: empleadoFiltro || undefined,
        page,
        pageSize: PAGE_SIZE,
      };

      const result = await (filtro === 'Pendiente'
        ? API.requests.listPending(params)
        : API.requests.listAll(filtro === 'Todas' ? undefined : filtro, params));

      // Si la página pedida quedó vacía porque la cantidad total bajó
      // (ej. se aprobó la única solicitud de la última página), vuelve
      // a la última página real en vez de mostrar un vacío engañoso —
      // el cambio de página dispara este mismo load() de nuevo.
      if (result.items.length === 0 && result.totalCount > 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE)));
        return;
      }

      const enriched = result.items.map((request) => {
        const nombre = request.employeeNombre ?? 'Empleado';
        return {
          ...request,
          employeeName: nombre,
          employeeInitials: getInitials(nombre),
        };
      });
      setRequests(enriched);
      setTotalCount(result.totalCount);
    } catch {
      setError('No pudimos cargar las solicitudes. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [filtro, tipoFiltro, fechaFiltro, empleadoFiltro, page]);

  useEffect(() => {
    // load() dispara setState propio (loading/error/data) — patrón de
    // fetch-en-efecto estándar de este proyecto, sin librería de
    // data-fetching. La regla no distingue setState sync de async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const approve = useCallback(
    async (id: string) => {
      if (!session) return;
      setActioningId(id);
      try {
        await API.requests.approve(id, session.userId);
        await load();
      } catch (err) {
        // P. ej. vacaciones sin saldo suficiente: el motivo del servidor
        // es más útil que un mensaje genérico.
        setError(errorMessage(err, 'No pudimos aprobar la solicitud. Intenta de nuevo.'));
      } finally {
        setActioningId(null);
      }
    },
    [session, load],
  );

  const deny = useCallback(
    async (id: string, motivo: string) => {
      if (!session) return;
      setActioningId(id);
      try {
        await API.requests.deny(id, session.userId, motivo);
        await load();
      } catch {
        setError('No pudimos denegar la solicitud. Intenta de nuevo.');
      } finally {
        setActioningId(null);
      }
    },
    [session, load],
  );

  return {
    requests,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    setPage,
    isLoading,
    error,
    actioningId,
    approve,
    deny,
    reload: load,
    filtro,
    setFiltro,
    empleados,
    empleadoFiltro,
    setEmpleadoFiltro,
    tipoFiltro,
    setTipoFiltro,
    fechaFiltro,
    setFechaFiltro,
  };
}
