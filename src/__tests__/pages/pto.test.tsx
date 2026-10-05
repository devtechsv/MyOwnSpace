import { render, screen, within } from '@testing-library/react';
import PtoPage from '@/pages/pto';
import { SessionContext } from '@/hooks/useSession';
import { resetMockState } from '@/services/mocks/mock-adapter';
import {
  calcularHorasDisponibles,
  calcularHorasEnAcumulacion,
  finPeriodoExclusivo,
} from '@/lib/pto-balance-calculator';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/pto', query: {}, asPath: '/pto' }),
}));

beforeEach(() => {
  resetMockState();
});

describe('Mi PTO', () => {
  it('muestra el balance disponible y lo que está en acumulación con su fecha', async () => {
    // u4 ingresó el 2024-02-01 en los fixtures del mock.
    render(
      <SessionContext.Provider
        value={{ userId: 'u4', nombre: 'Carlos Rivas', rol: 'Empleado', estado: 'Activo', mustChangePassword: false }}
      >
        <PtoPage />
      </SessionContext.Provider>,
    );

    const hoy = new Date().toISOString().slice(0, 10);
    const [y, m, d] = finPeriodoExclusivo('2024-02-01', hoy).split('-');

    // Cada valor dentro de su propia caja: ambos pueden coincidir (p. ej.
    // 120h el día antes del aniversario).
    const disponible = (await screen.findByText('Balance disponible:')).parentElement!;
    expect(
      await within(disponible).findByText(`${calcularHorasDisponibles('2024-02-01', undefined, hoy, hoy)}h`),
    ).toBeInTheDocument();

    const acumulacion = (await screen.findByText('En acumulación:')).parentElement!;
    expect(
      within(acumulacion).getByText(`${calcularHorasEnAcumulacion('2024-02-01', undefined, hoy)}h`),
    ).toBeInTheDocument();
    expect(within(acumulacion).getByText(`disponibles desde el ${d}/${m}/${y}`)).toBeInTheDocument();
  });
});
