import { render, screen } from '@testing-library/react';
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

  it('renderiza una fila por solicitud con su tipo, motivo y estado', () => {
    render(
      <RequestsTable requests={sample} isLoading={false} error={null} />,
    );

    expect(screen.getByText('Enfermedad')).toBeInTheDocument();
    expect(screen.getByText('Reposo médico')).toBeInTheDocument();
    expect(screen.getByText('Aprobada')).toBeInTheDocument();
  });
});
