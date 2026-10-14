import { act, renderHook, waitFor } from '@testing-library/react';
import { useAdminAudit } from './useAdminAudit';
import { mockAuditAdapter, mockUsersAdapter, resetMockState } from '@/services/mocks/mock-adapter';
import { errorDelApi } from '@/test-utils/api-error';

beforeEach(() => {
  resetMockState();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useAdminAudit', () => {
  it('carga los registros', async () => {
    await mockUsersAdapter.resetPassword('u3');
    await mockUsersAdapter.toggleStatus('u4');

    const { result } = renderHook(() => useAdminAudit());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entradas.map((e) => e.accion)).toEqual(['EstadoUsuarioCambiado', 'ContrasenaReseteada']);
    expect(result.current.totalCount).toBe(2);
  });

  it('manda los filtros y cambiar uno vuelve a la página 1', async () => {
    const spy = jest.spyOn(mockAuditAdapter, 'list');
    const { result } = renderHook(() => useAdminAudit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    act(() => result.current.setAccionFiltro('SolicitudDenegada'));
    act(() => result.current.setDesde('2026-10-01'));
    act(() => result.current.setHasta('2026-10-14'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.page).toBe(1);
    expect(spy).toHaveBeenLastCalledWith({
      accion: 'SolicitudDenegada',
      desde: '2026-10-01',
      hasta: '2026-10-14',
      page: 1,
      pageSize: 20,
    });
  });

  it('"Todas" no manda filtro de acción', async () => {
    const spy = jest.spyOn(mockAuditAdapter, 'list');
    const { result } = renderHook(() => useAdminAudit());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ accion: undefined, desde: undefined, hasta: undefined }));
  });

  it('con un error del API muestra su motivo', async () => {
    jest.spyOn(mockAuditAdapter, 'list').mockRejectedValue(
      errorDelApi(400, 'La fecha final no puede ser anterior a la inicial.'),
    );

    const { result } = renderHook(() => useAdminAudit());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('La fecha final no puede ser anterior a la inicial.');
  });
});
