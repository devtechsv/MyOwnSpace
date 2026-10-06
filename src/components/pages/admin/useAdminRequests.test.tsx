import { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdminRequests } from './useAdminRequests';
import { SessionContext } from '@/hooks/useSession';
import { resetMockState } from '@/services/mocks/mock-adapter';
import API from '@/services/api-services';

const session = {
  userId: 'u1',
  nombre: 'Julio Pérez',
  rol: 'Administrador' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

beforeEach(() => {
  resetMockState();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAdminRequests', () => {
  it('carga las solicitudes pendientes con el nombre real del empleado', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests.length).toBeGreaterThan(0);
    expect(result.current.requests.every((r) => r.estado === 'Pendiente')).toBe(
      true,
    );
    // r3 pertenece a Ana Martínez en los fixtures
    const deAna = result.current.requests.find((r) => r.id === 'r3');
    expect(deAna?.employeeName).toBe('Ana Martínez');
    expect(deAna?.employeeInitials).toBe('AM');
  });

  it('approve saca la solicitud de la lista (Pendiente) y la deja Aprobada en el mock', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.requests.length;

    await act(async () => {
      await result.current.approve('r3');
    });

    expect(result.current.requests).toHaveLength(before - 1);
    expect(result.current.requests.find((r) => r.id === 'r3')).toBeUndefined();

    const propias = await API.requests.listByEmployee('u3', { page: 1, pageSize: 20 });
    const r3 = propias.items.find((r) => r.id === 'r3');
    expect(r3?.estado).toBe('Aprobada');
    expect(r3?.reviewedBy).toBe('u1');
  });

  it('con filtro "Todas", approve actualiza el estado en la lista en vez de sacarla', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFiltro('Todas');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.requests.length;

    await act(async () => {
      await result.current.approve('r3');
    });

    expect(result.current.requests).toHaveLength(before);
    expect(result.current.requests.find((r) => r.id === 'r3')?.estado).toBe(
      'Aprobada',
    );
  });

  it('empleadoFiltro filtra por el id del empleado y totalCount refleja el filtro', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFiltro('Todas');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const totalSinFiltrar = result.current.totalCount;

    act(() => {
      result.current.setEmpleadoFiltro('u3'); // Ana Martínez
    });

    await waitFor(() => expect(result.current.totalCount).toBeLessThan(totalSinFiltrar));
    expect(result.current.requests.length).toBeGreaterThan(0);
    expect(result.current.requests.every((r) => r.employeeId === 'u3')).toBe(true);
    expect(result.current.page).toBe(1);
  });

  it('la lista de empleados deja fuera a los admins, va en orden alfabético y marca a los desactivados', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });

    await waitFor(() => expect(result.current.empleados.length).toBeGreaterThan(0));

    // u1 y u2 son administradores: no crean solicitudes.
    expect(result.current.empleados).toEqual([
      { id: 'u3', nombre: 'Ana Martínez' },
      { id: 'u4', nombre: 'Carlos Rivas' },
      { id: 'u6', nombre: 'Marta Gómez (desactivado)' },
      { id: 'u5', nombre: 'Sofía Nuñez' },
    ]);
  });

  it('si no se puede cargar la lista de empleados, las solicitudes se cargan igual', async () => {
    jest.spyOn(API.users, 'list').mockRejectedValue(new Error('caído'));

    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.requests.length).toBeGreaterThan(0);
    expect(result.current.empleados).toEqual([]);
  });

  it('tipoFiltro filtra por tipo de solicitud', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setTipoFiltro('Permiso personal');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // r3 y r5 (Ana Martínez, Pendientes) son las únicas de tipo "Permiso
    // personal" entre las pendientes — ver fixtures en mock-data.ts.
    expect(result.current.requests.length).toBeGreaterThan(0);
    expect(
      result.current.requests.every((r) => r.tipo === 'Permiso personal'),
    ).toBe(true);
  });

  it('tipoFiltro combinado con un empleado sin coincidencias deja la lista vacía', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setTipoFiltro('Permiso personal');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests.length).toBeGreaterThan(0);

    act(() => {
      result.current.setEmpleadoFiltro('u4');
    });

    // Carlos Rivas (u4) no tiene ninguna solicitud "Permiso personal".
    await waitFor(() => expect(result.current.requests).toHaveLength(0));
    expect(result.current.error).toBeNull();
  });

  it('fechaFiltro filtra las solicitudes cuyo rango de fechas incluye esa fecha', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFechaFiltro('2026-09-13');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // r6 (12-13 de sept., rango) y r7 (13 de sept.) incluyen esa fecha.
    const ids = result.current.requests.map((r) => r.id).sort();
    expect(ids).toEqual(['r6', 'r7']);
  });

  it('tipoFiltro y fechaFiltro combinados sin coincidencias dejan la lista vacía', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setTipoFiltro('Emergencia');
      result.current.setFechaFiltro('2026-09-12');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toHaveLength(0);
  });

  it('cambiar filtro (tab, tipo o fecha) vuelve a la página 1', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setTipoFiltro('Emergencia');
    });

    expect(result.current.page).toBe(1);
  });

  it('deny saca la solicitud de la lista y la deja Denegada con el motivo en el mock', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deny('r5', 'No hay cobertura ese día.');
    });

    expect(result.current.requests.find((r) => r.id === 'r5')).toBeUndefined();

    const propias = await API.requests.listByEmployee('u3', { page: 1, pageSize: 20 });
    const r5 = propias.items.find((r) => r.id === 'r5');
    expect(r5?.estado).toBe('Denegada');
    expect(r5?.reviewedBy).toBe('u1');
    expect(r5?.motivoRechazo).toBe('No hay cobertura ese día.');
  });
});
