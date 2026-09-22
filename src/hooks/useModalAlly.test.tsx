import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useModalAlly } from './useModalAlly';

function TestModal({
  isOpen,
  onClose,
  closeDisabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  const containerRef = useModalAlly(isOpen, onClose, closeDisabled);
  if (!isOpen) return null;
  return (
    <div ref={containerRef}>
      <button>Primero</button>
      <button>Segundo</button>
    </div>
  );
}

describe('useModalAlly', () => {
  it('mueve el foco al primer elemento enfocable al abrir', () => {
    render(<TestModal isOpen onClose={jest.fn()} />);

    expect(screen.getByText('Primero')).toHaveFocus();
  });

  it('Escape llama a onClose', () => {
    const onClose = jest.fn();
    render(<TestModal isOpen onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape no llama a onClose si closeDisabled es true', () => {
    const onClose = jest.fn();
    render(<TestModal isOpen onClose={onClose} closeDisabled />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('Tab desde el último elemento vuelve a enfocar el primero (ciclo)', () => {
    render(<TestModal isOpen onClose={jest.fn()} />);

    screen.getByText('Segundo').focus();
    fireEvent.keyDown(document, { key: 'Tab' });

    expect(screen.getByText('Primero')).toHaveFocus();
  });

  it('Shift+Tab desde el primer elemento enfoca el último (ciclo inverso)', () => {
    render(<TestModal isOpen onClose={jest.fn()} />);

    screen.getByText('Primero').focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(screen.getByText('Segundo')).toHaveFocus();
  });

  it('al cerrar, devuelve el foco al elemento que lo tenía antes de abrir', () => {
    function Wrapper() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button onClick={() => setIsOpen(true)}>Abrir</button>
          <TestModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </div>
      );
    }
    render(<Wrapper />);

    const trigger = screen.getByText('Abrir');
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByText('Primero')).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(trigger).toHaveFocus();
  });
});
