import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';
import { SessionContext } from '@/hooks/useSession';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('AppShell', () => {
  it('renderiza el Topbar, el sidebar recibido y el contenido', () => {
    render(
      <SessionContext.Provider value={null}>
        <AppShell sidebar={<div>Contenido del sidebar</div>}>
          <div>Contenido de la página</div>
        </AppShell>
      </SessionContext.Provider>,
    );

    expect(screen.getByText('MyOwnSpace')).toBeInTheDocument();
    expect(screen.getByText('Contenido del sidebar')).toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
  });
});
