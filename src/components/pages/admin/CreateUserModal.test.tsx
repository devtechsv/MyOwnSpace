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
      await screen.findByText('Ingresa el nombre completo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa el correo')).toBeInTheDocument();
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

    const usuarios = await mockUsersAdapter.list(1, 20);
    const nuevo = usuarios.items.find(
      (u) => u.correo === 'nuevo.empleado@devtch.com',
    );
    expect(nuevo?.estado).toBe('Pendiente');
    expect(nuevo?.rol).toBe('Empleado');
  });

  it('por defecto genera la contraseña automáticamente y no muestra el campo', async () => {
    const createSpy = jest.spyOn(mockUsersAdapter, 'create');
    const props = renderModal();

    expect(
      screen.getByRole('checkbox', { name: /generar contraseña automáticamente/i }),
    ).toBeChecked();
    expect(screen.queryByLabelText('Contraseña temporal')).not.toBeInTheDocument();

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(createSpy.mock.calls[0][0]).not.toHaveProperty('password');
    createSpy.mockRestore();
  });

  it('al desmarcar la casilla, permite escribir una contraseña manual y la envía', async () => {
    const createSpy = jest.spyOn(mockUsersAdapter, 'create');
    const props = renderModal();

    fillValidForm();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /generar contraseña automáticamente/i }),
    );
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'Manual#2026x' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    await waitFor(() => expect(props.onCreated).toHaveBeenCalled());
    expect(createSpy.mock.calls[0][0]).toMatchObject({ password: 'Manual#2026x' });
    createSpy.mockRestore();
  });

  it('con una contraseña manual que no cumple las reglas, no crea el usuario', async () => {
    const props = renderModal();

    fillValidForm();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /generar contraseña automáticamente/i }),
    );
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'corta' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear usuario/i }));

    expect(
      await screen.findByText('La contraseña no cumple los requisitos mínimos'),
    ).toBeInTheDocument();
    expect(props.onCreated).not.toHaveBeenCalled();
  });

  it('"Cancelar" cierra el modal sin crear nada', async () => {
    const before = await mockUsersAdapter.list(1, 20);
    const props = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onClose).toHaveBeenCalled();
    const after = await mockUsersAdapter.list(1, 20);
    expect(after.items).toHaveLength(before.items.length);
  });
});
