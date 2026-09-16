import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResetPasswordConfirmModal } from './ResetPasswordConfirmModal';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';

beforeEach(() => {
  resetMockState();
});

describe('ResetPasswordConfirmModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ResetPasswordConfirmModal
        isOpen={false}
        onClose={jest.fn()}
        userId='u1'
        userName='Julio Pérez'
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('modo autoservicio: título genérico y sin mostrar un correo específico', () => {
    render(
      <ResetPasswordConfirmModal
        isOpen
        onClose={jest.fn()}
        userId='u1'
        userName='Julio Pérez'
        isSelf
      />,
    );

    expect(
      screen.getByText('¿Restablecer tu propia contraseña?'),
    ).toBeInTheDocument();
    expect(screen.getByText(/tu dirección registrada/)).toBeInTheDocument();
  });

  it('modo admin-sobre-otro: título con el nombre y el correo explícito', () => {
    render(
      <ResetPasswordConfirmModal
        isOpen
        onClose={jest.fn()}
        userId='u4'
        userName='Carlos Rivas'
        userEmail='carlos.rivas@devtch.com'
      />,
    );

    expect(
      screen.getByText('¿Restablecer la contraseña de Carlos Rivas?'),
    ).toBeInTheDocument();
    expect(screen.getByText('carlos.rivas@devtch.com')).toBeInTheDocument();
  });

  it('"No" cierra el modal sin llamar al servicio', () => {
    const onClose = jest.fn();
    render(
      <ResetPasswordConfirmModal
        isOpen
        onClose={onClose}
        userId='u1'
        userName='Julio Pérez'
        isSelf
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('"Sí, restablecer" deja al usuario Pendiente y llama a onSuccess/onClose', async () => {
    const onClose = jest.fn();
    const onSuccess = jest.fn();
    render(
      <ResetPasswordConfirmModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        userId='u1'
        userName='Julio Pérez'
        isSelf
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /sí, restablecer/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();

    const usuarios = await mockUsersAdapter.list();
    expect(usuarios.find((u) => u.id === 'u1')?.estado).toBe('Pendiente');
  });
});
