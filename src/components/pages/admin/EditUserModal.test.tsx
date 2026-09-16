import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditUserModal } from './EditUserModal';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';
import { User } from '@/contracts/interfaces/user';

const julio: User = {
  id: 'u1',
  nombre: 'Julio Pérez',
  correo: 'julio.perez@devtch.com',
  rol: 'Administrador',
  estado: 'Activo',
};

function renderModal(
  props: Partial<React.ComponentProps<typeof EditUserModal>> = {},
) {
  const defaultProps = {
    user: julio,
    onClose: jest.fn(),
    onUpdated: jest.fn(),
  };
  const merged = { ...defaultProps, ...props };
  render(<EditUserModal {...merged} />);
  return merged;
}

beforeEach(() => {
  resetMockState();
});

describe('EditUserModal', () => {
  it('precarga el formulario con los datos del usuario', () => {
    renderModal();

    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Julio Pérez');
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(
      'julio.perez@devtch.com',
    );
  });

  it('exige nombre y correo', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('Nombre completo'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(
      await screen.findByText('Ingresa el nombre completo'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ingresa el correo')).toBeInTheDocument();
  });

  it('con un correo perteneciente a otro usuario, muestra el error en el campo Correo', async () => {
    const props = renderModal();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'carlos.rivas@devtch.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(
      await screen.findByText('Ya existe un usuario con el correo ingresado.'),
    ).toBeInTheDocument();
    expect(props.onUpdated).not.toHaveBeenCalled();
  });

  it('con datos válidos, actualiza el usuario y llama a onUpdated/onClose', async () => {
    const props = renderModal();

    fireEvent.change(screen.getByLabelText('Nombre completo'), {
      target: { value: 'Julio Pérez Actualizado' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(props.onUpdated).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();

    const usuarios = await mockUsersAdapter.list();
    const actualizado = usuarios.find((u) => u.id === 'u1');
    expect(actualizado?.nombre).toBe('Julio Pérez Actualizado');
  });

  it('"Cancelar" cierra el modal sin modificar nada', () => {
    const props = renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onUpdated).not.toHaveBeenCalled();
  });
});
