import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdminPto } from './useAdminPto';
import { resetMockState, mockPtoAdapter, mockRequestsAdapter, mockUsersAdapter } from '@/services/mocks/mock-adapter';

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
  jest.restoreAllMocks();
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

      // Cambiar de mes vuelve a pedir al servidor: hay que esperar la respuesta.
      await waitFor(() => expect(result.current.rows.map((r) => r.id)).toContain(solicitud.id));
    } finally {
      jest.useRealTimers();
    }
  });

  it('no descarga la lista de usuarios: pide solo el mes al servidor y usa el nombre que trae cada fila', async () => {
    // Regresión: antes paginaba GET /users entero (admins incluidos) solo
    // para resolver nombres, y traía todo el historial de vacaciones.
    const usersSpy = jest.spyOn(mockUsersAdapter, 'list');
    const calendarioSpy = jest.spyOn(mockPtoAdapter, 'listCalendario');
    await reservaAprobada('u3', DIAS_HABILES_OCT[1], 8);

    const { result } = renderHook(() => useAdminPto());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(usersSpy).not.toHaveBeenCalled();
    expect(calendarioSpy).toHaveBeenCalledWith('2026-10');
    expect(result.current.rows[0].employeeName).toBe('Ana Martínez');
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

    // Cambiar de mes vuelve a pedir al servidor: hay que esperar la respuesta.
    await waitFor(() => expect(result.current.totalCount).toBe(2));
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
    'elegir un empleado de la lista vuelve a la página 1 y filtra por su id',
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
        result.current.setEmpleadoFiltro('u3'); // Ana Martínez
      });

      expect(result.current.page).toBe(1);
      expect(result.current.totalCount).toBe(8);
      expect(result.current.rows.every((r) => r.employeeId === 'u3')).toBe(true);
    },
    15000,
  );

  it('la lista ofrece a cada empleado con reservas una sola vez, ordenados por nombre', async () => {
    await reservaAprobada('u4', DIAS_HABILES_OCT[2], 8);
    await reservaAprobada('u3', DIAS_HABILES_OCT[1], 8);
    await reservaAprobada('u3', DIAS_HABILES_OCT[3], 8);

    const { result } = renderHook(() => useAdminPto());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Ana Martínez (u3) antes que Carlos Rivas (u4), aunque u3 tenga dos reservas.
    expect(result.current.empleados.map((e) => e.id)).toEqual(['u3', 'u4']);
  });

  it('el empleado elegido se conserva al cambiar a un mes donde no tiene reservas', async () => {
    await reservaAprobada('u3', DIAS_HABILES_OCT[1], 8);
    await reservaAprobada('u4', DIA_HABIL_NOV, 8);

    const { result } = renderHook(() => useAdminPto());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // u4 solo tiene reservas en noviembre: no aparece en la lista de octubre.
    expect(result.current.empleados.map((e) => e.id)).toEqual(['u3']);

    act(() => {
      result.current.setEmpleadoFiltro('u3');
    });
    act(() => {
      result.current.setMesFiltro('2026-11');
    });
    await waitFor(() => expect(result.current.empleados.map((e) => e.id)).toContain('u4'));

    expect(result.current.empleadoFiltro).toBe('u3');
    expect(result.current.empleados.map((e) => e.id)).toContain('u3');
    expect(result.current.totalCount).toBe(0);

    act(() => {
      result.current.setEmpleadoFiltro(''); // "Todos los empleados"
    });
    expect(result.current.totalCount).toBe(1);
  });
});
