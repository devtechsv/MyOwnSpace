import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordModal } from './ChangePasswordModal';

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), {
    target: { value: 'TemporalVieja123!' },
  });
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
    target: { value: 'NuevaValida456!' },
  });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
    target: { value: 'NuevaValida456!' },
  });
}

describe('ChangePasswordModal (modo normal, autoservicio)', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <ChangePasswordModal isOpen={false} onClose={jest.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el botón "Cancelar" y lo cierra al hacer click', () => {
    const onClose = jest.fn();
    render(<ChangePasswordModal isOpen onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('no muestra el mensaje de contraseña temporal', () => {
    render(<ChangePasswordModal isOpen onClose={jest.fn()} />);

    expect(
      screen.queryByText(/entraste con una contraseña temporal/i),
    ).not.toBeInTheDocument();
  });
});

describe('ChangePasswordModal (forced=true, tras una contraseña temporal)', () => {
  it('no muestra el botón "Cancelar"', () => {
    render(<ChangePasswordModal isOpen forced onClose={jest.fn()} />);

    expect(
      screen.queryByRole('button', { name: /cancelar/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra el mensaje explicando por qué tiene que cambiarla', () => {
    render(<ChangePasswordModal isOpen forced onClose={jest.fn()} />);

    expect(
      screen.getByText(/entraste con una contraseña temporal/i),
    ).toBeInTheDocument();
  });

  it('Escape no cierra el modal', () => {
    const onClose = jest.fn();
    render(<ChangePasswordModal isOpen forced onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('completar el formulario con datos válidos llama a onClose (única forma de salir)', async () => {
    const onClose = jest.fn();
    render(<ChangePasswordModal isOpen forced onClose={onClose} />);

    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
