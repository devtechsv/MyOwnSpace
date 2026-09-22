import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequestPtoModal } from './RequestPtoModal';
import { SessionContext } from '@/hooks/useSession';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';
import API from '@/services/api-services';

const session = {
  userId: 'u4',
  nombre: 'Carlos Rivas',
  rol: 'Empleado' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
};

const hoy = new Date().toISOString().slice(0, 10);

function renderModal(props: Partial<React.ComponentProps<typeof RequestPtoModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    fecha: hoy,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };
  const merged = { ...defaultProps, ...props };
  render(
    <SessionContext.Provider value={session}>
      <RequestPtoModal {...merged} />
    </SessionContext.Provider>,
  );
  return merged;
}

beforeEach(() => {
  resetMockState();
});

describe('RequestPtoModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <SessionContext.Provider value={session}>
        <RequestPtoModal isOpen={false} fecha={hoy} onClose={jest.fn()} />
      </SessionContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('arranca en "Jornada completa" sin mostrar el input de horas', () => {
    renderModal();

    expect(screen.getByLabelText('Jornada completa (8h)')).toBeChecked();
    expect(screen.queryByLabelText('Horas')).not.toBeInTheDocument();
  });

  it('al elegir "Tiempo personalizado" muestra el input de horas', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Tiempo personalizado'));

    expect(screen.getByLabelText('Horas')).toBeInTheDocument();
  });

  it('exige horas mayores a 0 en modo personalizado', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Tiempo personalizado'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(
      await screen.findByText('Ingresa una cantidad de horas mayor a 0'),
    ).toBeInTheDocument();
  });

  it('con "Jornada completa", reserva 8h y llama a onCreated/onClose', async () => {
    const props = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();

    const reservas = await API.requests.listByEmployee('u4');
    const nueva = reservas.find((r) => r.tipo === 'Vacaciones' && r.fechaInicio === hoy);
    expect(nueva?.horasSolicitadas).toBe(8);
    expect(nueva?.estado).toBe('Aprobada');
  });

  it('con balance insuficiente, muestra el error del servidor', async () => {
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const nuevo = await mockUsersAdapter.create({
      nombre: 'Sin Balance',
      correo: 'sin.balance@devtch.com',
      rol: 'Empleado',
      fechaIngreso: mañana.toISOString().slice(0, 10),
    });
    const sessionSinBalance = { ...session, userId: nuevo.id };

    render(
      <SessionContext.Provider value={sessionSinBalance}>
        <RequestPtoModal isOpen fecha={hoy} onClose={jest.fn()} onCreated={jest.fn()} />
      </SessionContext.Provider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(
      await screen.findByText('No tienes balance de PTO suficiente para esa cantidad de horas.'),
    ).toBeInTheDocument();
  });

  it('"Cancelar" cierra el modal sin crear nada', async () => {
    const before = await API.requests.listByEmployee('u4');
    const props = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onClose).toHaveBeenCalled();
    const after = await API.requests.listByEmployee('u4');
    expect(after).toHaveLength(before.length);
  });
});
