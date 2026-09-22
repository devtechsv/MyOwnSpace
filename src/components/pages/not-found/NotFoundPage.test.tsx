import { render, screen } from '@testing-library/react';
import NotFoundPage from './NotFoundPage';

describe('404', () => {
  it('muestra un mensaje genérico y un enlace para volver al inicio', () => {
    render(<NotFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Esta página no existe')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /volver al inicio/i }),
    ).toHaveAttribute('href', '/');
  });

  it('no dice nada que sugiera "existe pero no tienes acceso"', () => {
    render(<NotFoundPage />);

    expect(screen.queryByText(/acceso|permiso|autorizado/i)).not.toBeInTheDocument();
  });
});
