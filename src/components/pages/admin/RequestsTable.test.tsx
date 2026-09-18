import { render, screen, fireEvent } from '@testing-library/react';
import { RequestsTable } from './RequestsTable';
import { AdminRequestRow } from './useAdminRequests';

const sample: AdminRequestRow[] = [
  {
    id: 'r6',
    employeeId: 'u4',
    tipo: 'Enfermedad',
    fechaInicio: '2026-09-12',
    fechaFin: '2026-09-13',
    motivo: 'Reposo médico, certificado adjunto',
    estado: 'Pendiente',
    createdAt: '2026-09-11T14:00:00.000Z',
    employeeName: 'Carlos Rivas',
    employeeInitials: 'CR',
  },
];

describe('RequestsTable (admin)', () => {
  it('muestra el estado de carga', () => {
    render(
      <RequestsTable
        requests={[]}
        isLoading
        error={null}
        actioningId={null}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />,
    );
    expect(screen.getByText(/cargando solicitudes/i)).toBeInTheDocument();
  });

  it('muestra un mensaje cuando no hay solicitudes para el filtro actual', () => {
    render(
      <RequestsTable
        requests={[]}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/no hay solicitudes para este filtro/i),
    ).toBeInTheDocument();
  });

  it('renderiza el nombre del empleado, tipo, motivo y las acciones', () => {
    render(
      <RequestsTable
        requests={sample}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />,
    );

    expect(screen.getByText('Carlos Rivas')).toBeInTheDocument();
    expect(screen.getByText('CR')).toBeInTheDocument();
    expect(screen.getByText('Enfermedad')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /aprobar/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /denegar/i })).toBeInTheDocument();
  });

  it('"Aprobar" y "Denegar" llaman a los callbacks con el id correcto', () => {
    const onApprove = jest.fn();
    const onDeny = jest.fn();
    render(
      <RequestsTable
        requests={sample}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={onApprove}
        onDeny={onDeny}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /aprobar/i }));
    fireEvent.click(screen.getByRole('button', { name: /denegar/i }));

    expect(onApprove).toHaveBeenCalledWith('r6');
    expect(onDeny).toHaveBeenCalledWith('r6');
  });

  it('muestra el StatusBadge en vez de Aprobar/Denegar cuando ya no está Pendiente', () => {
    const revisada: AdminRequestRow = { ...sample[0], estado: 'Aprobada' };
    render(
      <RequestsTable
        requests={[revisada]}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />,
    );

    expect(screen.getByText('Aprobada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /aprobar/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /denegar/i }),
    ).not.toBeInTheDocument();
  });

  it('deshabilita los botones de la fila en acción', () => {
    render(
      <RequestsTable
        requests={sample}
        isLoading={false}
        error={null}
        actioningId='r6'
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /aprobar/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /denegar/i })).toBeDisabled();
  });
});
