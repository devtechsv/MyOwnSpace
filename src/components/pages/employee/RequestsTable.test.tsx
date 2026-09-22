import { render, screen, fireEvent } from '@testing-library/react';
import { RequestsTable } from './RequestsTable';
import { LeaveRequest } from '@/contracts/interfaces/request';

const sample: LeaveRequest[] = [
  {
    id: 'r1',
    employeeId: 'u3',
    tipo: 'Enfermedad',
    fechaInicio: '2026-09-02',
    fechaFin: '2026-09-02',
    motivo: 'Reposo médico',
    estado: 'Aprobada',
    createdAt: '2026-08-30T00:00:00.000Z',
  },
];

describe('RequestsTable', () => {
  it('muestra el estado de carga', () => {
    render(<RequestsTable requests={[]} isLoading error={null} />);
    expect(screen.getByText(/cargando solicitudes/i)).toBeInTheDocument();
  });

  it('muestra el error cuando falla la carga', () => {
    render(
      <RequestsTable requests={[]} isLoading={false} error='Falló todo' />,
    );
    expect(screen.getByText('Falló todo')).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay solicitudes', () => {
    render(<RequestsTable requests={[]} isLoading={false} error={null} />);
    expect(
      screen.getByText(/todavía no creaste ninguna solicitud/i),
    ).toBeInTheDocument();
  });

  it('acepta un mensaje de vacío alternativo (p. ej. cuando el vacío es por un filtro)', () => {
    render(
      <RequestsTable
        requests={[]}
        isLoading={false}
        error={null}
        emptyMessage='No hay solicitudes que coincidan con estos filtros.'
      />,
    );
    expect(
      screen.getByText(/no hay solicitudes que coincidan con estos filtros/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/todavía no creaste ninguna solicitud/i),
    ).not.toBeInTheDocument();
  });

  it('renderiza una fila por solicitud con su tipo, motivo y estado', () => {
    render(
      <RequestsTable requests={sample} isLoading={false} error={null} />,
    );

    expect(screen.getByText('Enfermedad')).toBeInTheDocument();
    expect(screen.getByText('Reposo médico')).toBeInTheDocument();
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
  });

  it('el motivo del rechazo está oculto hasta hacer click en la fila, y se puede volver a ocultar', () => {
    const denegada: LeaveRequest = {
      ...sample[0],
      estado: 'Denegada',
      motivoRechazo: 'No hay cobertura ese día.',
    };
    render(
      <RequestsTable requests={[denegada]} isLoading={false} error={null} />,
    );

    expect(
      screen.queryByText('No hay cobertura ese día.'),
    ).not.toBeInTheDocument();

    const fila = screen.getByRole('button', { name: /ver motivo del rechazo/i });
    expect(fila).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(fila);

    expect(screen.getByText('No hay cobertura ese día.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /ocultar motivo del rechazo/i }),
    ).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(screen.getByRole('button', { name: /ocultar motivo del rechazo/i }));

    expect(
      screen.queryByText('No hay cobertura ese día.'),
    ).not.toBeInTheDocument();
  });
});
