import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdminPto } from './useAdminPto';
import { resetMockState, mockPtoAdapter, mockRequestsAdapter } from '@/services/mocks/mock-adapter';

// Fecha fija (jueves 2026-10-01): la API rechaza fechas pasadas y fines
// de semana, así que las reservas de prueba usan días hábiles futuros en
// vez de "días 1..8 del mes actual" (que pasaban solo porque antes no se
// validaba la fecha).
const DIAS_HABILES_OCT = [
  '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06',
  '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-12',
];
const DIA_HABIL_NOV = '2026-11-02';

// Una solicitud de un día nace Pendiente: solo cuenta como PTO del equipo
// una vez que un admin la aprueba.
async function reservaAprobada(employeeId: string, fecha: string, horas: number) {
  const solicitud = await mockPtoAdapter.create(employeeId, { fecha, horas });
  await mockRequestsAdapter.approve(solicitud.id, 'u1');
}

beforeEach(() => {
  resetMockState();
  // Solo se fija Date (el mock simula latencia con setTimeout real).
  jest.useFakeTimers({
    now: new Date('2026-10-01T12:00:00Z'),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'nextTick', 'queueMicrotask'],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useAdminPto', () => {
  it('un rango de vacaciones aparece también en los meses que abarca después del inicio', async () => {
    // Solo se fija Date (el mock simula latencia con setTimeout real).
    jest.useFakeTimers({
      now: new Date('2026-10-28T12:00:00Z'),
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'nextTick', 'queueMicrotask'],
    });
    try {
      // Jueves 29-oct a martes 3-nov.
      const solicitud = await mockPtoAdapter.createVacationRequest('u4', {
        fechaInicio: '2026-10-29',
        fechaFin: '2026-11-03',
      });
      await mockRequestsAdapter.approve(solicitud.id, 'u1');

      const { result } = renderHook(() => useAdminPto());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      act(() => {
        result.current.setMesFiltro('2026-11');
      });

      expect(result.current.rows.map((r) => r.id)).toContain(solicitud.id);
    } finally {
      jest.useRealTimers();
    }
  });

  it('por defecto solo muestra reservas del mes actual', async () => {
    await reservaAprobada('u3', DIAS_HABILES_OCT[1], 8);
    await reservaAprobada('u4', DIA_HABIL_NOV, 8);

    const { result } = renderHook(() => useAdminPto());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalCount).toBe(1);
    expect(result.current.rows[0].fechaInicio).toBe(DIAS_HABILES_OCT[1]);
  });

  it('"Ver todos" (mesFiltro vacío) muestra reservas de cualquier mes', async () => {
    await reservaAprobada('u3', DIAS_HABILES_OCT[1], 8);
    await reservaAprobada('u4', DIA_HABIL_NOV, 8);

    const { result } = renderHook(() => useAdminPto());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setMesFiltro('');
    });

    expect(result.current.totalCount).toBe(2);
  });

  it(
    'pagina de a 15 filas y "totalPages" refleja el total filtrado',
    async () => {
      // 16 reservas del mes actual entre 2 empleados (fechas distintas
      // entre sí, para no chocar con "una reserva por fecha por
      // empleado"). Secuencial a propósito: el mock muta un array en
      // memoria — en paralelo, dos creates podrían perder la escritura
      // del otro (leen la misma foto de "requests" antes de que
      // cualquiera de las dos confirme la suya).
      for (const fecha of DIAS_HABILES_OCT) {
        await reservaAprobada('u3', fecha, 1);
      }
      for (const fecha of DIAS_HABILES_OCT) {
        await reservaAprobada('u4', fecha, 1);
      }

      const { result } = renderHook(() => useAdminPto());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.totalCount).toBe(16);
      expect(result.current.rows).toHaveLength(15);
      expect(result.current.totalPages).toBe(2);
      expect(result.current.page).toBe(1);

      act(() => {
        result.current.setPage((p) => p + 1);
      });

      await waitFor(() => expect(result.current.page).toBe(2));
      expect(result.current.rows).toHaveLength(1);
    },
    15000,
  );

  it(
    'cambiar el filtro de nombre vuelve a la página 1',
    async () => {
      for (const fecha of DIAS_HABILES_OCT) {
        await reservaAprobada('u3', fecha, 1);
      }
      for (const fecha of DIAS_HABILES_OCT) {
        await reservaAprobada('u4', fecha, 1);
      }

      const { result } = renderHook(() => useAdminPto());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.setPage((p) => p + 1);
      });
      await waitFor(() => expect(result.current.page).toBe(2));

      act(() => {
        result.current.setNombreQuery('ana'); // u3 = Ana Martínez
      });

      expect(result.current.page).toBe(1);
      expect(
        result.current.rows.every((r) => r.employeeName === 'Ana Martínez'),
      ).toBe(true);
    },
    15000,
  );
});
