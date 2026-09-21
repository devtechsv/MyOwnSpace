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

  it('approve saca la solicitud de la lista y la deja Aprobada en el mock', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const before = result.current.requests.length;

    await act(async () => {
      await result.current.approve('r3');
    });

    expect(result.current.requests).toHaveLength(before - 1);
    expect(result.current.requests.find((r) => r.id === 'r3')).toBeUndefined();

    const propias = await API.requests.listByEmployee('u3');
    const r3 = propias.find((r) => r.id === 'r3');
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

  it('deny saca la solicitud de la lista y la deja Denegada con el motivo en el mock', async () => {
    const { result } = renderHook(() => useAdminRequests(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deny('r5', 'No hay cobertura ese día.');
    });

    expect(result.current.requests.find((r) => r.id === 'r5')).toBeUndefined();

    const propias = await API.requests.listByEmployee('u3');
    const r5 = propias.find((r) => r.id === 'r5');
    expect(r5?.estado).toBe('Denegada');
    expect(r5?.reviewedBy).toBe('u1');
    expect(r5?.motivoRechazo).toBe('No hay cobertura ese día.');
  });
});
