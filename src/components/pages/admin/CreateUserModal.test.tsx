import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateUserModal } from './CreateUserModal';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';

function renderModal(
  props: Partial<React.ComponentProps<typeof CreateUserModal>> = {},
) {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onCreated: jest.fn(),
  };
  const merged = { ...defaultProps, ...props };
  render(<CreateUserModal {...merged} />);
  return merged;
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), {
    target: { value: 'Nuevo Empleado' },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'nuevo.empleado@devtch.com' },
  });
  fireEvent.change(screen.getByLabelText('Fecha de ingreso'), {
    target: { value: '2026-01-01' },
  });
}

beforeEach(() => {
  resetMockState();
});

describe('CreateUserModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <CreateUserModal isOpen={false} onClose={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('el rol solo permite Empleado o Administrador', () => {
    renderModal();

    expect(screen.getByRole('option', { name: 'Empleado' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Administrador' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /superadmin/i }),
    ).not.toBeInTheDocument();
  });

  it('exige nombre y correo', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(
      await screen.findByText('Ingresá el nombre completo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresá el correo')).toBeInTheDocument();
  });

  it('con un correo ya existente, muestra el error en el campo Correo', async () => {
    const props = renderModal();

    fireEvent.change(screen.getByLabelText('Nombre completo'), {
      target: { value: 'Otro Nombre' },
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'julio.perez@devtch.com' },
    });
    fireEvent.change(screen.getByLabelText('Fecha de ingreso'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(
      await screen.findByText('Ya existe un usuario con ese correo.'),
    ).toBeInTheDocument();
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  it('con datos válidos, crea el usuario en Pendiente y llama a onCreated/onClose', async () => {
    const props = renderModal();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();

    const usuarios = await mockUsersAdapter.list();
    const nuevo = usuarios.find(
      (u) => u.correo === 'nuevo.empleado@devtch.com',
    );
    expect(nuevo?.estado).toBe('Pendiente');
    expect(nuevo?.rol).toBe('Empleado');
  });

  it('"Cancelar" cierra el modal sin crear nada', async () => {
    const before = await mockUsersAdapter.list();
    const props = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onClose).toHaveBeenCalled();
    const after = await mockUsersAdapter.list();
    expect(after).toHaveLength(before.length);
  });
});
