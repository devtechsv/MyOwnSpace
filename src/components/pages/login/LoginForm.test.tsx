import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { deleteCookie } from 'cookies-next';
import LoginForm from './LoginForm';
import { resetMockState } from '@/services/mocks/mock-adapter';
import { SESSION_COOKIE } from '@/services/auth/auth.api';

const pushMock = jest.fn();
const useRouterMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => useRouterMock(),
}));

function fillAndSubmit(correo: string, password: string) {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: correo },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));
}

beforeEach(() => {
  resetMockState();
  deleteCookie(SESSION_COOKIE);
  pushMock.mockClear();
  useRouterMock.mockReturnValue({ push: pushMock, query: {} });
});

describe('LoginForm', () => {
  it('muestra errores de validación con datos inválidos, sin llamar al servicio', async () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: /ingresar/i }));

    expect(await screen.findByText('Ingresa tu correo')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tu contraseña')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('muestra error de formato con un correo mal escrito', async () => {
    render(<LoginForm />);

    fillAndSubmit('no-es-un-correo', 'algo');

    expect(await screen.findByText('Correo inválido')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('login exitoso de un empleado redirige a /', async () => {
    render(<LoginForm />);

    fillAndSubmit('ana.martinez@devtch.com', 'cualquiera');

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/'));
  });

  it('login exitoso de un administrador redirige a /admin/requests', async () => {
    render(<LoginForm />);

    fillAndSubmit('julio.perez@devtch.com', 'cualquiera');

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith('/admin/requests'),
    );
  });

  it('credenciales que no existen muestran un mensaje de error genérico', async () => {
    render(<LoginForm />);

    fillAndSubmit('no-existe@devtch.com', 'x');

    expect(
      await screen.findByText('Correo o contraseña incorrectos.'),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('un usuario desactivado tampoco puede iniciar sesión', async () => {
    render(<LoginForm />);

    fillAndSubmit('marta.gomez@devtch.com', 'x');

    expect(
      await screen.findByText('Correo o contraseña incorrectos.'),
    ).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('incluye el toggle de tema y el copyright', () => {
    render(<LoginForm />);

    expect(
      screen.getByRole('button', { name: /cambiar a modo/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/devtech 2026/i)).toBeInTheDocument();
  });

  it('incluye el enlace para recuperar la contraseña', () => {
    render(<LoginForm />);

    expect(
      screen.getByRole('link', { name: /olvidaste tu contraseña/i }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('con ?expired=1, muestra el aviso de sesión vencida por inactividad', () => {
    useRouterMock.mockReturnValue({
      push: pushMock,
      query: { expired: '1' },
    });

    render(<LoginForm />);

    expect(
      screen.getByText(/tu sesión expiró por inactividad/i),
    ).toBeInTheDocument();
  });

  it('sin ?expired=1, no muestra el aviso de sesión vencida', () => {
    render(<LoginForm />);

    expect(
      screen.queryByText(/tu sesión expiró por inactividad/i),
    ).not.toBeInTheDocument();
  });
});
