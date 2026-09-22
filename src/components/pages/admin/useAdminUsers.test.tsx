import { renderHook, waitFor } from '@testing-library/react';
import { useAdminUsers } from './useAdminUsers';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';

beforeEach(() => {
  resetMockState();
});

describe('useAdminUsers', () => {
  it('carga los usuarios y calcula los contadores correctamente', async () => {
    const { result } = renderHook(() => useAdminUsers());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const fixtures = await mockUsersAdapter.list(1, 20);
    expect(result.current.users).toHaveLength(fixtures.items.length);

    const activosEsperados = fixtures.items.filter((u) => u.estado === 'Activo').length;
    const pendientesEsperados = fixtures.items.filter(
      (u) => u.estado === 'Pendiente',
    ).length;

    expect(result.current.stats).toEqual({
      total: fixtures.items.length,
      activos: activosEsperados,
      pendientes: pendientesEsperados,
    });
  });
});
