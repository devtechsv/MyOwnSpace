import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PtoPage from '@/pages/pto';
import { SessionContext } from '@/hooks/useSession';
import { resetMockState } from '@/services/mocks/mock-adapter';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/pto', query: {}, asPath: '/pto' }),
}));

// Solo se fija Date (el mock simula latencia con setTimeout real).
beforeEach(() => {
  resetMockState();
  jest.useFakeTimers({
    now: new Date('2026-10-05T12:00:00Z'),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'nextTick', 'queueMicrotask'],
  });
});

afterEach(() => {
  jest.useRealTimers();
});

function renderPagina() {
  // u4 ingresó el 2024-02-01 y tiene 120h reclamadas en los fixtures.
  render(
    <SessionContext.Provider
      value={{ userId: 'u4', nombre: 'Carlos Rivas', rol: 'Empleado', estado: 'Activo', mustChangePassword: false }}
    >
      <PtoPage />
    </SessionContext.Provider>,
  );
}

describe('Mi PTO', () => {
  it('muestra acumuladas, reclamadas por habilitar y disponibles', async () => {
    renderPagina();

    const acumuladas = await screen.findByRole('region', { name: 'Horas acumuladas' });
    expect(within(acumuladas).getByText('80h')).toBeInTheDocument();
    expect(within(acumuladas).getByText(/antes del 31\/12\/2026/)).toBeInTheDocument();

    const bloqueadas = screen.getByRole('region', { name: 'Horas reclamadas por habilitar' });
    expect(within(bloqueadas).getByText('0h')).toBeInTheDocument();
    expect(within(bloqueadas).getByText(/01\/02\/2027/)).toBeInTheDocument();

    const disponibles = screen.getByRole('region', { name: 'Horas disponibles' });
    expect(within(disponibles).getByText('120h')).toBeInTheDocument();
  });

  it('"Reclamar" pasa las acumuladas a reclamadas por habilitar', async () => {
    renderPagina();

    const acumuladas = await screen.findByRole('region', { name: 'Horas acumuladas' });
    fireEvent.click(within(acumuladas).getByRole('button', { name: 'Reclamar' }));

    await waitFor(() => expect(within(acumuladas).getByText('0h')).toBeInTheDocument());
    const bloqueadas = screen.getByRole('region', { name: 'Horas reclamadas por habilitar' });
    expect(within(bloqueadas).getByText('80h')).toBeInTheDocument();
    expect(within(acumuladas).getByRole('button', { name: 'Reclamar' })).toBeDisabled();
  });

  it('"Solicitar vacaciones" calcula los días hábiles del rango antes de enviar', async () => {
    renderPagina();
    await screen.findByRole('region', { name: 'Horas disponibles' });

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar vacaciones' }));
    const modal = screen.getByRole('dialog', { name: 'Solicitar vacaciones' });
    fireEvent.change(within(modal).getByLabelText('Fecha de inicio'), { target: { value: '2026-10-15' } });
    fireEvent.change(within(modal).getByLabelText('Fecha de fin'), { target: { value: '2026-10-20' } });

    // Jue 15 a mar 20: 4 días hábiles.
    expect(within(modal).getByText('32h')).toBeInTheDocument();

    fireEvent.click(within(modal).getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Tras enviar se recarga el PTO: hay que esperar a que vuelva la tarjeta.
    const disponibles = await screen.findByRole('region', { name: 'Horas disponibles' });
    await waitFor(() => expect(within(disponibles).getByText('88h')).toBeInTheDocument());
  });

  it('avisa si el rango empieza en fin de semana y no deja enviar', async () => {
    renderPagina();
    await screen.findByRole('region', { name: 'Horas disponibles' });

    fireEvent.click(screen.getByRole('button', { name: 'Solicitar vacaciones' }));
    const modal = screen.getByRole('dialog', { name: 'Solicitar vacaciones' });
    fireEvent.change(within(modal).getByLabelText('Fecha de inicio'), { target: { value: '2026-10-10' } });
    fireEvent.change(within(modal).getByLabelText('Fecha de fin'), { target: { value: '2026-10-14' } });

    expect(within(modal).getByText('Las vacaciones no pueden iniciar en sábado ni domingo.')).toBeInTheDocument();
    expect(within(modal).getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
  });
});
