import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordForm from './ForgotPasswordForm';
import { resetMockState } from '@/services/mocks/mock-adapter';
import API from '@/services/api-services';
import { errorDelApi } from '@/test-utils/api-error';

// Los tests del 429 reemplazan métodos de API: si uno falla a mitad, el
// mock no debe contaminar al siguiente.
afterEach(() => {
  jest.restoreAllMocks();
});

const pushMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  resetMockState();
  pushMock.mockClear();
});

describe('ForgotPasswordForm', () => {
  it('muestra error de validación con el campo vacío, sin navegar', async () => {
    render(<ForgotPasswordForm />);

    fireEvent.click(
      screen.getByRole('button', { name: /enviar instrucciones/i }),
    );

    expect(await screen.findByText('Ingresa tu correo')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('muestra error de formato con un correo mal escrito, sin navegar', async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'no-es-un-correo' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /enviar instrucciones/i }),
    );

    expect(await screen.findByText('Correo inválido')).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('con un correo que existe en el mock, navega a la confirmación', async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ana.martinez@devtch.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /enviar instrucciones/i }),
    );

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        '/forgot-password/sent?correo=ana.martinez%40devtch.com',
      ),
    );
  });

  it('con un correo que NO existe, navega igual a la confirmación (no revela nada)', async () => {
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'no-existe@devtch.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /enviar instrucciones/i }),
    );

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        '/forgot-password/sent?correo=no-existe%40devtch.com',
      ),
    );
  });

  it('con el límite de intentos alcanzado (429), avisa y no navega a la confirmación', async () => {
    jest.spyOn(API.auth, 'forgotPassword').mockRejectedValue(errorDelApi(429));
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ana.martinez@devtch.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /enviar instrucciones/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Hubo demasiados intentos seguidos desde tu red. Espera un minuto e inténtalo de nuevo.',
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('con otro error del API, navega igual a la confirmación (no revela nada)', async () => {
    jest.spyOn(API.auth, 'forgotPassword').mockRejectedValue(errorDelApi(500));
    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ana.martinez@devtch.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /enviar instrucciones/i }),
    );

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        '/forgot-password/sent?correo=ana.martinez%40devtch.com',
      ),
    );
  });

  it('incluye el enlace para volver a inicio de sesión', () => {
    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole('link', { name: /volver a inicio de sesión/i }),
    ).toHaveAttribute('href', '/login');
  });
});
