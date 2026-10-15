import { render, screen, within } from '@testing-library/react';
import { AuditTable, formatFechaHora } from './AuditTable';
import { AuditLog } from '@/contracts/interfaces/audit';

const base: AuditLog = {
  id: 'a1',
  actorId: 'u1',
  actorNombre: 'Julio Pérez',
  accion: 'SolicitudDenegada',
  entidadTipo: 'Solicitud',
  entidadId: 'r6',
  entidadNombre: 'Carlos Rivas',
  detalle: 'Ese día hay entrega',
  // 3:05 p. m. en El Salvador.
  createdAt: '2026-10-14T21:05:00Z',
};

function filaDesktop() {
  return within(screen.getAllByTestId('fila-desktop')[0]);
}

describe('AuditTable', () => {
  it('muestra quién, qué, sobre quién y el detalle de cada registro', () => {
    render(<AuditTable entradas={[base]} isLoading={false} error={null} />);

    const fila = filaDesktop();
    expect(fila.getByText('Julio Pérez')).toBeInTheDocument();
    expect(fila.getByText('Denegó una solicitud')).toBeInTheDocument();
    expect(fila.getByText('Solicitud de Carlos Rivas')).toBeInTheDocument();
    expect(fila.getByText('Motivo: Ese día hay entrega')).toBeInTheDocument();
  });

  it('muestra la hora de El Salvador, no la UTC', () => {
    // 01:30 UTC del 15 = 7:30 p. m. del 14 en El Salvador.
    const texto = formatFechaHora('2026-10-15T01:30:00Z');

    expect(texto).toMatch(/14/);
    expect(texto).toMatch(/7:30\sp\.\s?m\./);
  });

  it('usuario afectado, sin detalle y lo que ya no existe', () => {
    render(
      <AuditTable
        entradas={[
          { ...base, id: 'a1', accion: 'ContrasenaReseteada', entidadTipo: 'Usuario', entidadNombre: 'Ana Martínez', detalle: null },
          { ...base, id: 'a2', accion: 'UsuarioEditado', entidadTipo: 'Usuario', entidadNombre: null, detalle: 'Nombre: X' },
        ]}
        isLoading={false}
        error={null}
      />,
    );

    const [primera, segunda] = screen.getAllByTestId('fila-desktop').map((f) => within(f));
    expect(primera.getByText('Reseteó una contraseña')).toBeInTheDocument();
    expect(primera.getByText('Ana Martínez')).toBeInTheDocument();
    expect(primera.getByText('—')).toBeInTheDocument();
    expect(segunda.getByText('Usuario eliminado')).toBeInTheDocument();
  });

  it('accesos: inicio de sesión, intento fallido sobre una cuenta y con un correo no registrado', () => {
    render(
      <AuditTable
        entradas={[
          { ...base, id: 'a1', accion: 'InicioSesion', actorNombre: 'Ana Martínez', entidadTipo: 'Usuario', entidadNombre: 'Ana Martínez', detalle: null },
          { ...base, id: 'a2', accion: 'InicioSesionFallido', actorId: null, actorNombre: '(desconocido)', entidadTipo: 'Usuario', entidadId: 'u3', entidadNombre: 'Ana Martínez', detalle: 'Contraseña incorrecta o vencida.' },
          { ...base, id: 'a3', accion: 'InicioSesionFallido', actorId: null, actorNombre: '(desconocido)', entidadTipo: 'Usuario', entidadId: null, entidadNombre: null, detalle: 'Correo no registrado.' },
        ]}
        isLoading={false}
        error={null}
      />,
    );

    expect(screen.getByText('Usuario')).toBeInTheDocument();
    const [inicio, sobreCuenta, sinCuenta] = screen.getAllByTestId('fila-desktop').map((f) => within(f));
    expect(inicio.getByText('Inició sesión')).toBeInTheDocument();
    expect(sobreCuenta.getByText('(desconocido)')).toBeInTheDocument();
    expect(sobreCuenta.getByText('Ana Martínez')).toBeInTheDocument();
    expect(sobreCuenta.getByText('Motivo: Contraseña incorrecta o vencida.')).toBeInTheDocument();
    expect(sinCuenta.getByText('Intento de inicio de sesión fallido')).toBeInTheDocument();
    expect(sinCuenta.getByText('—')).toBeInTheDocument();
    expect(sinCuenta.queryByText('Usuario eliminado')).not.toBeInTheDocument();
    expect(sinCuenta.getByText('Motivo: Correo no registrado.')).toBeInTheDocument();
  });

  it('estados de carga, error y vacío', () => {
    const { rerender } = render(<AuditTable entradas={[]} isLoading error={null} />);
    expect(screen.getByText('Cargando auditoría…')).toBeInTheDocument();

    rerender(<AuditTable entradas={[]} isLoading={false} error='Falló' />);
    expect(screen.getByText('Falló')).toBeInTheDocument();

    rerender(<AuditTable entradas={[]} isLoading={false} error={null} />);
    expect(screen.getByText('No hay registros para este filtro.')).toBeInTheDocument();
  });
});
