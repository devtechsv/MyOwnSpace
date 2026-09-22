import { render, screen, fireEvent, within } from '@testing-library/react';
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

    const fila = within(screen.getByTestId('fila-desktop'));
    expect(fila.getByText('Enfermedad')).toBeInTheDocument();
    expect(fila.getByText('Reposo médico')).toBeInTheDocument();
    expect(fila.getByText('Aprobada')).toBeInTheDocument();
  });

  it('en pantallas angostas renderiza una tarjeta apilada con los mismos datos, etiquetados', () => {
    render(
      <RequestsTable requests={sample} isLoading={false} error={null} />,
    );

    const tarjeta = within(screen.getByTestId('fila-mobile'));
    expect(tarjeta.getByText('Enfermedad')).toBeInTheDocument();
    expect(tarjeta.getByText('Fecha')).toBeInTheDocument();
    expect(tarjeta.getByText('Motivo')).toBeInTheDocument();
    expect(tarjeta.getByText('Reposo médico')).toBeInTheDocument();
    expect(tarjeta.getByText('Aprobada')).toBeInTheDocument();
  });

  it('el motivo del rechazo está oculto hasta hacer click en "ver motivo completo", y se puede volver a ocultar', () => {
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

    const fila = within(screen.getByTestId('fila-desktop'));
    const boton = fila.getByRole('button', { name: /ver motivo completo/i });
    expect(boton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(boton);

    expect(screen.getByText('No hay cobertura ese día.')).toBeInTheDocument();
    expect(
      fila.getByRole('button', { name: /ocultar motivo completo/i }),
    ).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(
      fila.getByRole('button', { name: /ocultar motivo completo/i }),
    );

    expect(
      screen.queryByText('No hay cobertura ese día.'),
    ).not.toBeInTheDocument();
  });

  it('"Ver motivo completo" despliega el motivo original aunque la solicitud no esté denegada', () => {
    render(
      <RequestsTable requests={sample} isLoading={false} error={null} />,
    );

    fireEvent.click(
      within(screen.getByTestId('fila-desktop')).getByRole('button', {
        name: /ver motivo completo/i,
      }),
    );

    expect(
      within(screen.getByTestId('motivo-expandido')).getByText('Reposo médico'),
    ).toBeInTheDocument();
  });
});
