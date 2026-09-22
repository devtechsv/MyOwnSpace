import { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEmployeeRequests } from './useEmployeeRequests';
import { SessionContext } from '@/hooks/useSession';
import { resetMockState } from '@/services/mocks/mock-adapter';

const session = {
  userId: 'u3',
  nombre: 'Ana Martínez',
  rol: 'Empleado' as const,
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

describe('useEmployeeRequests', () => {
  it('carga las solicitudes del empleado de la sesión al montar', async () => {
    const { result } = renderHook(() => useEmployeeRequests(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests.length).toBeGreaterThan(0);
    expect(
      result.current.requests.every((r) => r.employeeId === 'u3'),
    ).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reload vuelve a traer los datos', async () => {
    const { result } = renderHook(() => useEmployeeRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.requests.length).toBeGreaterThan(0);
  });

  it('sin sesión, no intenta cargar nada', () => {
    const { result } = renderHook(() => useEmployeeRequests(), {
      wrapper: ({ children }) => (
        <SessionContext.Provider value={null}>
          {children}
        </SessionContext.Provider>
      ),
    });

    expect(result.current.requests).toEqual([]);
  });

  it('tipoFiltro filtra las propias solicitudes por tipo', async () => {
    const { result } = renderHook(() => useEmployeeRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setTipoFiltro('Permiso personal');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // r3 y r5 son las únicas "Permiso personal" de Ana Martínez (u3).
    const ids = result.current.requests.map((r) => r.id).sort();
    expect(ids).toEqual(['r3', 'r5']);
  });

  it('fechaFiltro filtra las propias solicitudes cuyo rango incluye esa fecha', async () => {
    const { result } = renderHook(() => useEmployeeRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFechaFiltro('2026-09-02');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests.map((r) => r.id)).toEqual(['r1']);
  });

  it('tipoFiltro y fechaFiltro combinados sin coincidencias dejan la lista vacía', async () => {
    const { result } = renderHook(() => useEmployeeRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setTipoFiltro('Emergencia');
      result.current.setFechaFiltro('2026-09-02');
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.requests).toHaveLength(0);
  });
});
