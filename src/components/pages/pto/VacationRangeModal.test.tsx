import { render, screen, fireEvent } from '@testing-library/react';
import { VacationRangeModal } from './VacationRangeModal';
import { SessionContext } from '@/hooks/useSession';
import { esDiaHabil, sumarAnios, sumarDias } from '@/lib/dias-habiles';
import { hoyIso } from '@/helpers/hoy-iso';

const session = {
  userId: 'u4',
  nombre: 'Carlos Rivas',
  rol: 'Empleado' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
};

// Próximo día hábil desde hoy (incluido), para que la suite no dependa del
// día de la semana en que corre.
function proximoDiaHabil(): string {
  let dia = hoyIso();
  while (!esDiaHabil(dia)) dia = sumarDias(dia, 1);
  return dia;
}

const inicio = proximoDiaHabil();

function renderModal() {
  render(
    <SessionContext.Provider value={session}>
      <VacationRangeModal isOpen horasDisponibles={120} onClose={jest.fn()} />
    </SessionContext.Provider>,
  );
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: inicio } });
}

describe('VacationRangeModal', () => {
  it('limita la fecha de fin a un año desde el inicio', () => {
    renderModal();

    expect(screen.getByLabelText('Fecha de fin')).toHaveAttribute('max', sumarAnios(inicio, 1));
  });

  it('avisa antes de enviar si el rango supera un año y no deja enviar', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Fecha de fin'), {
      target: { value: sumarDias(sumarAnios(inicio, 1), 1) },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('El rango de vacaciones no puede superar un año.');
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
  });

  it('con un rango válido muestra los días hábiles y las horas', () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: inicio } });

    expect(screen.getByText(/de tus 120h disponibles/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeEnabled();
  });
});
