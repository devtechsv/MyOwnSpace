import { render, screen } from '@testing-library/react';
import { SessionContext, useSession } from './useSession';

function Probe() {
  const session = useSession();
  return <span>{session ? session.nombre : 'sin sesión'}</span>;
}

describe('useSession', () => {
  it('devuelve null fuera de un SessionContext.Provider', () => {
    render(<Probe />);
    expect(screen.getByText('sin sesión')).toBeInTheDocument();
  });

  it('devuelve la sesión provista por SessionContext.Provider', () => {
    const session = {
      userId: 'u1',
      nombre: 'Julio Pérez',
      rol: 'Administrador' as const,
      estado: 'Activo' as const,
    };

    render(
      <SessionContext.Provider value={session}>
        <Probe />
      </SessionContext.Provider>,
    );

    expect(screen.getByText('Julio Pérez')).toBeInTheDocument();
  });
});
