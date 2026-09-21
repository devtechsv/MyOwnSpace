import { render, screen, fireEvent, within } from '@testing-library/react';
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

  it('"Aprobar" llama al callback con el id correcto', () => {
    const onApprove = jest.fn();
    render(
      <RequestsTable
        requests={sample}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={onApprove}
        onDeny={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /aprobar/i }));

    expect(onApprove).toHaveBeenCalledWith('r6');
  });

  it('"Denegar" abre el modal, y confirmar con un motivo llama a onDeny con el id y el motivo', () => {
    const onDeny = jest.fn();
    render(
      <RequestsTable
        requests={sample}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={jest.fn()}
        onDeny={onDeny}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /denegar/i }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/motivo del rechazo/i), {
      target: { value: 'No hay cobertura ese día.' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /denegar/i }));

    expect(onDeny).toHaveBeenCalledWith('r6', 'No hay cobertura ese día.');
  });

  it('el modal de denegar no deja confirmar sin escribir un motivo', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /denegar/i }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: /denegar/i }),
    ).toBeDisabled();
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
  });

  it('el motivo del rechazo está oculto hasta hacer click en la fila, y no hay botones de Aprobar/Denegar', () => {
    const denegada: AdminRequestRow = {
      ...sample[0],
      estado: 'Denegada',
      motivoRechazo: 'No hay cobertura ese día.',
    };
    render(
      <RequestsTable
        requests={[denegada]}
        isLoading={false}
        error={null}
        actioningId={null}
        onApprove={jest.fn()}
        onDeny={jest.fn()}
      />,
    );

    expect(
      screen.queryByText('No hay cobertura ese día.'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^aprobar$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^denegar$/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /ver motivo del rechazo/i }),
    );

    expect(screen.getByText('No hay cobertura ese día.')).toBeInTheDocument();
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
