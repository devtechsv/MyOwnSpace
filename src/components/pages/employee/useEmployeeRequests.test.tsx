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
});
