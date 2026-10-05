import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { FullscreenToggle } from './FullscreenToggle';

let fullscreenElement: Element | null = null;

beforeEach(() => {
  fullscreenElement = null;
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  document.documentElement.requestFullscreen = jest.fn(async () => {
    fullscreenElement = document.documentElement;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  document.exitFullscreen = jest.fn(async () => {
    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
});

describe('FullscreenToggle', () => {
  it('sin Fullscreen API (fullscreenElement undefined) no se muestra como activo', () => {
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => undefined });

    render(<FullscreenToggle />);

    expect(screen.getByRole('button', { name: 'Pantalla completa' })).toBeInTheDocument();
  });

  it('entra y sale de pantalla completa', async () => {
    render(<FullscreenToggle />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Pantalla completa' }));
    });
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();

    const salir = await screen.findByRole('button', { name: /salir de pantalla completa/i });
    await act(async () => {
      fireEvent.click(salir);
    });
    expect(document.exitFullscreen).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Pantalla completa' })).toBeInTheDocument(),
    );
  });
});
