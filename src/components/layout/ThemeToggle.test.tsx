import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: prefersDark,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })),
  });
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    mockMatchMedia(false);
  });

  it('arranca en modo claro y el botón permite pasar a oscuro y volver', () => {
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    const toDark = screen.getByRole('button', {
      name: /cambiar a modo oscuro/i,
    });

    fireEvent.click(toDark);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    const toLight = screen.getByRole('button', {
      name: /cambiar a modo claro/i,
    });

    fireEvent.click(toLight);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
