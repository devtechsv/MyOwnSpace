import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SetPasswordForm from './SetPasswordForm';
import { resetMockState, mockUsersAdapter } from '@/services/mocks/mock-adapter';

const pushMock = jest.fn();
const useRouterMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => useRouterMock(),
}));

function typePassword(value: string) {
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
    target: { value },
  });
}

function typeConfirm(value: string) {
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value },
  });
}

beforeEach(() => {
  resetMockState();
  pushMock.mockClear();
  useRouterMock.mockReturnValue({ push: pushMock, query: { token: 'u5' } });
});

describe('SetPasswordForm', () => {
  it('arranca con todos los requisitos sin cumplir y el botón deshabilitado', () => {
    render(<SetPasswordForm />);

    expect(screen.getByText('Mínimo 10 caracteres')).toHaveClass(
      'text-muted',
    );
    expect(
      screen.getByRole('button', { name: /guardar contraseña/i }),
    ).toBeDisabled();
  });

  it('el checklist refleja en vivo cada requisito mientras se escribe', () => {
    render(<SetPasswordForm />);

    typePassword('Dt#2026reto');

    expect(screen.getByText('Mínimo 10 caracteres')).toHaveClass(
      'text-foreground',
    );
    expect(screen.getByText('Al menos una mayúscula (A-Z)')).toHaveClass(
      'text-foreground',
    );
    expect(screen.getByText('Al menos un número (0-9)')).toHaveClass(
      'text-foreground',
    );
    expect(screen.getByText('Al menos un carácter especial (!@#$...)')).toHaveClass(
      'text-foreground',
    );
  });

  it('marca contraseñas genéricas como requisito no cumplido aunque el resto pase', () => {
    render(<SetPasswordForm />);

    typePassword('Password123!');

    expect(
      screen.getByText('No ser una contraseña genérica o la temporal recibida'),
    ).toHaveClass('text-muted');
  });

  it('muestra "no coinciden" si confirmar difiere, y el botón sigue deshabilitado', () => {
    render(<SetPasswordForm />);

    typePassword('Dt#2026reto');
    typeConfirm('OtraCosa1!');

    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /guardar contraseña/i }),
    ).toBeDisabled();
  });

  it('habilita el botón solo cuando todo se cumple y las contraseñas coinciden', () => {
    render(<SetPasswordForm />);

    typePassword('Dt#2026reto');
    typeConfirm('Dt#2026reto');

    expect(
      screen.getByRole('button', { name: /guardar contraseña/i }),
    ).toBeEnabled();
  });

  it('al guardar, el usuario del token queda Activo y redirige a /login', async () => {
    render(<SetPasswordForm />);

    typePassword('Dt#2026reto');
    typeConfirm('Dt#2026reto');
    fireEvent.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));

    const usuarios = await mockUsersAdapter.list();
    const sofia = usuarios.find((u) => u.id === 'u5');
    expect(sofia?.estado).toBe('Activo');
  });

  it('con un token inválido, muestra un error genérico y no navega', async () => {
    useRouterMock.mockReturnValue({
      push: pushMock,
      query: { token: 'no-existe' },
    });

    render(<SetPasswordForm />);

    typePassword('Dt#2026reto');
    typeConfirm('Dt#2026reto');
    fireEvent.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(
      await screen.findByText(/no pudimos actualizar tu contraseña/i),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
