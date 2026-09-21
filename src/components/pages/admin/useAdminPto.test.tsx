import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdminPto } from './useAdminPto';
import { resetMockState, mockPtoAdapter } from '@/services/mocks/mock-adapter';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function fechaDelMesActual(dia: number): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(dia)}`;
}

function fechaDelMesAnterior(): string {
  const hoy = new Date();
  const mesPrevio = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 15);
  return `${mesPrevio.getFullYear()}-${pad(mesPrevio.getMonth() + 1)}-15`;
}

beforeEach(() => {
  resetMockState();
});

describe('useAdminPto', () => {
  it('por defecto solo muestra reservas del mes actual', async () => {
    await mockPtoAdapter.create('u3', { fecha: fechaDelMesActual(2), horas: 8 });
    await mockPtoAdapter.create('u4', { fecha: fechaDelMesAnterior(), horas: 8 });

    const { result } = renderHook(() => useAdminPto());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalCount).toBe(1);
    expect(result.current.rows[0].fechaInicio).toBe(fechaDelMesActual(2));
  });

  it('"Ver todos" (mesFiltro vacío) muestra reservas de cualquier mes', async () => {
    await mockPtoAdapter.create('u3', { fecha: fechaDelMesActual(2), horas: 8 });
    await mockPtoAdapter.create('u4', { fecha: fechaDelMesAnterior(), horas: 8 });

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
      for (let dia = 1; dia <= 8; dia++) {
        await mockPtoAdapter.create('u3', { fecha: fechaDelMesActual(dia), horas: 1 });
      }
      for (let dia = 1; dia <= 8; dia++) {
        await mockPtoAdapter.create('u4', { fecha: fechaDelMesActual(dia), horas: 1 });
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
      for (let dia = 1; dia <= 8; dia++) {
        await mockPtoAdapter.create('u3', { fecha: fechaDelMesActual(dia), horas: 1 });
      }
      for (let dia = 1; dia <= 8; dia++) {
        await mockPtoAdapter.create('u4', { fecha: fechaDelMesActual(dia), horas: 1 });
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
