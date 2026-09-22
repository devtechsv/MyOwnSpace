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

    const fila = within(screen.getByTestId('fila-desktop'));
    expect(fila.getByText('Carlos Rivas')).toBeInTheDocument();
    expect(fila.getByText('CR')).toBeInTheDocument();
    expect(fila.getByText('Enfermedad')).toBeInTheDocument();
    expect(fila.getByRole('button', { name: /aprobar/i })).toBeInTheDocument();
    expect(fila.getByRole('button', { name: /denegar/i })).toBeInTheDocument();
  });

  it('en pantallas angostas renderiza una tarjeta apilada con los mismos datos, etiquetados', () => {
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

    const tarjeta = within(screen.getByTestId('fila-mobile'));
    expect(tarjeta.getByText('Carlos Rivas')).toBeInTheDocument();
    expect(tarjeta.getByText('Tipo')).toBeInTheDocument();
    expect(tarjeta.getByText('Enfermedad')).toBeInTheDocument();
    expect(tarjeta.getByText('Motivo')).toBeInTheDocument();
    expect(
      tarjeta.getByText('Reposo médico, certificado adjunto'),
    ).toBeInTheDocument();
    expect(tarjeta.getByRole('button', { name: /aprobar/i })).toBeInTheDocument();
    expect(tarjeta.getByRole('button', { name: /denegar/i })).toBeInTheDocument();
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

    fireEvent.click(
      within(screen.getByTestId('fila-desktop')).getByRole('button', {
        name: /aprobar/i,
      }),
    );

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

    fireEvent.click(
      within(screen.getByTestId('fila-desktop')).getByRole('button', {
        name: /denegar/i,
      }),
    );

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

    fireEvent.click(
      within(screen.getByTestId('fila-desktop')).getByRole('button', {
        name: /denegar/i,
      }),
    );

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

    expect(
      within(screen.getByTestId('fila-desktop')).getByText('Aprobada'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /aprobar/i }),
    ).not.toBeInTheDocument();
  });

  it('el motivo del rechazo está oculto hasta hacer click en "ver motivo completo", y no hay botones de Aprobar/Denegar', () => {
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
      within(screen.getByTestId('fila-desktop')).getByRole('button', {
        name: /ver motivo completo/i,
      }),
    );

    expect(screen.getByText('No hay cobertura ese día.')).toBeInTheDocument();
  });

  it('"Ver motivo completo" despliega el motivo original aunque la solicitud no esté denegada', () => {
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

    fireEvent.click(
      within(screen.getByTestId('fila-desktop')).getByRole('button', {
        name: /ver motivo completo/i,
      }),
    );

    expect(
      within(screen.getByTestId('motivo-expandido')).getByText(
        'Reposo médico, certificado adjunto',
      ),
    ).toBeInTheDocument();
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

    const fila = within(screen.getByTestId('fila-desktop'));
    expect(fila.getByRole('button', { name: /aprobar/i })).toBeDisabled();
    expect(fila.getByRole('button', { name: /denegar/i })).toBeDisabled();
  });
});
