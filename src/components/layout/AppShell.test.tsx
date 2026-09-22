import { render, screen, fireEvent } from '@testing-library/react';
import { AppShell } from './AppShell';
import { SessionContext } from '@/hooks/useSession';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function renderShell() {
  return render(
    <SessionContext.Provider value={null}>
      <AppShell sidebar={<div>Contenido del sidebar</div>}>
        <div>Contenido de la página</div>
      </AppShell>
    </SessionContext.Provider>,
  );
}

describe('AppShell', () => {
  it('renderiza el Topbar, el sidebar recibido y el contenido', () => {
    renderShell();

    expect(screen.getByText('MyOwnSpace')).toBeInTheDocument();
    expect(screen.getByText('Contenido del sidebar')).toBeInTheDocument();
    expect(screen.getByText('Contenido de la página')).toBeInTheDocument();
  });

  it('el menú móvil está cerrado por defecto y se abre con el botón de menú', () => {
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }));

    expect(
      screen.getAllByText('Contenido del sidebar').length,
    ).toBeGreaterThan(1);
    expect(
      screen.getByRole('button', { name: /cerrar menú/i }),
    ).toBeInTheDocument();
  });

  it('el menú móvil se cierra al hacer click en el fondo', () => {
    const { container } = renderShell();

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }));
    expect(
      screen.getByRole('button', { name: /cerrar menú/i }),
    ).toBeInTheDocument();

    fireEvent.click(container.querySelector('.bg-black\\/40') as Element);

    expect(
      screen.queryByRole('button', { name: /cerrar menú/i }),
    ).not.toBeInTheDocument();
  });

  it('el menú móvil se cierra con la tecla Escape', () => {
    renderShell();

    fireEvent.click(screen.getByRole('button', { name: /abrir menú/i }));
    expect(
      screen.getByRole('button', { name: /cerrar menú/i }),
    ).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(
      screen.queryByRole('button', { name: /cerrar menú/i }),
    ).not.toBeInTheDocument();
  });
});
