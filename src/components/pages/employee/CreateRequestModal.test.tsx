import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateRequestModal } from './CreateRequestModal';
import { SessionContext } from '@/hooks/useSession';
import { resetMockState } from '@/services/mocks/mock-adapter';
import API from '@/services/api-services';

const session = {
  userId: 'u4',
  nombre: 'Carlos Rivas',
  rol: 'Empleado' as const,
  estado: 'Activo' as const,
};

function renderModal(props: Partial<React.ComponentProps<typeof CreateRequestModal>> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };
  const merged = { ...defaultProps, ...props };
  render(
    <SessionContext.Provider value={session}>
      <CreateRequestModal {...merged} />
    </SessionContext.Provider>,
  );
  return merged;
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Desde'), {
    target: { value: '2026-10-01' },
  });
  fireEvent.change(screen.getByLabelText('Hasta'), {
    target: { value: '2026-10-02' },
  });
  fireEvent.change(screen.getByLabelText('Motivo'), {
    target: { value: 'Motivo de prueba' },
  });
}

beforeEach(() => {
  resetMockState();
});

describe('CreateRequestModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <SessionContext.Provider value={session}>
        <CreateRequestModal isOpen={false} onClose={jest.fn()} />
      </SessionContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('incluye los 4 tipos exactos de solicitud', () => {
    renderModal();

    ['Emergencia', 'Enfermedad', 'Permiso personal', 'Otro'].forEach((tipo) => {
      expect(screen.getByRole('option', { name: tipo })).toBeInTheDocument();
    });
  });

  it('exige fecha desde, hasta y motivo', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(await screen.findByText('Ingresá la fecha de inicio')).toBeInTheDocument();
    expect(screen.getByText('Ingresá la fecha de fin')).toBeInTheDocument();
    expect(screen.getByText('Contanos brevemente el motivo')).toBeInTheDocument();
  });

  it('rechaza cuando "hasta" es anterior a "desde"', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-10-10' },
    });
    fireEvent.change(screen.getByLabelText('Hasta'), {
      target: { value: '2026-10-05' },
    });
    fireEvent.change(screen.getByLabelText('Motivo'), {
      target: { value: 'Motivo de prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    expect(
      await screen.findByText('No puede ser anterior a la fecha de inicio'),
    ).toBeInTheDocument();
  });

  it('con datos válidos, crea la solicitud y llama a onCreated/onClose', async () => {
    const before = await API.requests.listByEmployee('u4');
    const props = renderModal();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /enviar solicitud/i }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();

    const after = await API.requests.listByEmployee('u4');
    expect(after).toHaveLength(before.length + 1);
    const nueva = after.find((r) => r.motivo === 'Motivo de prueba');
    expect(nueva?.estado).toBe('Pendiente');
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
