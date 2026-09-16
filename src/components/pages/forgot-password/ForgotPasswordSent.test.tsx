import { render, screen } from '@testing-library/react';
import ForgotPasswordSent from './ForgotPasswordSent';

const useRouterMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => useRouterMock(),
}));

describe('ForgotPasswordSent', () => {
  it('muestra el correo recibido por query, con mensaje genérico', () => {
    useRouterMock.mockReturnValue({
      query: { correo: 'ana.martinez@devtch.com' },
    });

    render(<ForgotPasswordSent />);

    expect(screen.getByText(/ana\.martinez@devtch\.com/)).toBeInTheDocument();
    expect(screen.getByText(/está registrado/i)).toBeInTheDocument();
  });

  it('incluye el enlace para volver a inicio de sesión', () => {
    useRouterMock.mockReturnValue({ query: {} });

    render(<ForgotPasswordSent />);

    expect(
      screen.getByRole('link', { name: /volver a inicio de sesión/i }),
    ).toHaveAttribute('href', '/login');
  });
});
