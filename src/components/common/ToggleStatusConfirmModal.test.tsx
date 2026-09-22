import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToggleStatusConfirmModal } from './ToggleStatusConfirmModal';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';
import { User } from '@/contracts/interfaces/user';

const activo: User = {
  id: 'u1',
  nombre: 'Julio Pérez',
  correo: 'julio.perez@devtch.com',
  rol: 'Administrador',
  estado: 'Activo',
  fechaIngreso: '2022-01-10',
};

const desactivado: User = { ...activo, id: 'u6', estado: 'Desactivado' };

function renderModal(
  user: User,
  overrides: Partial<React.ComponentProps<typeof ToggleStatusConfirmModal>> = {},
) {
  const props = { user, onClose: jest.fn(), onSuccess: jest.fn(), ...overrides };
  render(<ToggleStatusConfirmModal {...props} />);
  return props;
}

beforeEach(() => {
  resetMockState();
});

describe('ToggleStatusConfirmModal', () => {
  it('con un usuario Activo, ofrece desactivar', () => {
    renderModal(activo);

    expect(screen.getByText('¿Desactivar a Julio Pérez?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sí, desactivar/i }),
    ).toBeInTheDocument();
  });

  it('con un usuario Desactivado, ofrece activar', () => {
    renderModal(desactivado);

    expect(screen.getByText('¿Activar a Julio Pérez?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sí, activar/i }),
    ).toBeInTheDocument();
  });

  it('confirma y cambia el estado del usuario', async () => {
    const props = renderModal(activo);

    fireEvent.click(screen.getByRole('button', { name: /sí, desactivar/i }));

    await waitFor(() => expect(props.onSuccess).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();

    const usuarios = await mockUsersAdapter.list(1, 20);
    const actualizado = usuarios.items.find((u) => u.id === 'u1');
    expect(actualizado?.estado).toBe('Desactivado');
  });

  it('"Cancelar" cierra sin cambiar el estado', () => {
    const props = renderModal(activo);

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(props.onClose).toHaveBeenCalled();
    expect(props.onSuccess).not.toHaveBeenCalled();
  });
});
