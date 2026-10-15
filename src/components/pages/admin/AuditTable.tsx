import { AuditAction, AuditLog } from '@/contracts/interfaces/audit';

interface Props {
  entradas: AuditLog[];
  isLoading: boolean;
  error: string | null;
}

export const ACCION_LABELS: Record<AuditAction, string> = {
  UsuarioCreado: 'Creó un usuario',
  UsuarioEditado: 'Editó un usuario',
  ContrasenaReseteada: 'Reseteó una contraseña',
  EstadoUsuarioCambiado: 'Cambió el estado de un usuario',
  SolicitudAprobada: 'Aprobó una solicitud',
  SolicitudDenegada: 'Denegó una solicitud',
  InicioSesion: 'Inició sesión',
  InicioSesionFallido: 'Intento de inicio de sesión fallido',
  CierreSesion: 'Cerró sesión',
};

// Siempre en hora de El Salvador, aunque el navegador esté en otra zona:
// es la misma hora con la que se filtra por fecha.
const formatoFechaHora = new Intl.DateTimeFormat('es', {
  timeZone: 'America/El_Salvador',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  // "7:30 p. m.", como se usa en El Salvador ('es' sola da 19:30).
  hour12: true,
});

export function formatFechaHora(isoUtc: string): string {
  return formatoFechaHora.format(new Date(isoUtc));
}

function sobre(entrada: AuditLog): string {
  // Inicio de sesión fallido con un correo no registrado: no hay cuenta
  // afectada (el motivo ya lo dice el detalle).
  if (entrada.entidadId === null) return '—';
  if (entrada.entidadNombre) {
    return entrada.entidadTipo === 'Solicitud'
      ? `Solicitud de ${entrada.entidadNombre}`
      : entrada.entidadNombre;
  }
  return entrada.entidadTipo === 'Solicitud' ? 'Solicitud eliminada' : 'Usuario eliminado';
}

function detalle(entrada: AuditLog): string {
  if (!entrada.detalle) return '—';
  // En una denegación, el motivo tal cual lo escribió el admin; en un inicio
  // de sesión fallido, por qué se rechazó.
  return entrada.accion === 'SolicitudDenegada' || entrada.accion === 'InicioSesionFallido'
    ? `Motivo: ${entrada.detalle}`
    : entrada.detalle;
}

const ENCABEZADO = 'text-xs font-semibold text-muted uppercase tracking-wide';
const ETIQUETA_MOBILE = 'block text-[11px] font-semibold text-muted uppercase tracking-wide';
const COLUMNAS = 'md:grid-cols-[1.2fr_1.2fr_1.5fr_1.3fr_2fr]';

export function AuditTable({ entradas, isLoading, error }: Props) {
  if (isLoading) {
    return <p className='text-sm text-muted'>Cargando auditoría…</p>;
  }

  if (error) {
    return <p className='text-sm text-red-500'>{error}</p>;
  }

  if (entradas.length === 0) {
    return <p className='text-sm text-muted'>No hay registros para este filtro.</p>;
  }

  return (
    <div className='border border-border rounded-2xl overflow-hidden bg-surface'>
      <div className={`hidden md:grid ${COLUMNAS} px-5 py-3.5 bg-surface-field border-b border-border`}>
        <span className={ENCABEZADO}>Fecha y hora</span>
        <span className={ENCABEZADO}>Usuario</span>
        <span className={ENCABEZADO}>Acción</span>
        <span className={ENCABEZADO}>Sobre</span>
        <span className={ENCABEZADO}>Detalle</span>
      </div>

      {entradas.map((entrada) => (
        <div key={entrada.id} className='border-b border-border last:border-b-0'>
          <div
            data-testid='fila-desktop'
            className={`hidden md:grid ${COLUMNAS} px-5 py-4 items-center gap-x-3`}
          >
            <span className='text-sm text-muted'>{formatFechaHora(entrada.createdAt)}</span>
            <span className='text-sm font-medium text-foreground truncate'>{entrada.actorNombre}</span>
            <span className='text-sm text-foreground'>{ACCION_LABELS[entrada.accion]}</span>
            <span className='text-sm text-foreground truncate'>{sobre(entrada)}</span>
            <span className='text-sm text-muted break-words'>{detalle(entrada)}</span>
          </div>

          <div data-testid='fila-mobile' className='md:hidden px-4 py-4 flex flex-col gap-2'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-medium text-foreground truncate'>{entrada.actorNombre}</span>
              <span className='text-xs text-muted shrink-0'>{formatFechaHora(entrada.createdAt)}</span>
            </div>
            <span className='text-sm text-foreground'>
              {ACCION_LABELS[entrada.accion]} · {sobre(entrada)}
            </span>
            {entrada.detalle && (
              <div>
                <span className={ETIQUETA_MOBILE}>Detalle</span>
                <span className='text-sm text-muted break-words'>{detalle(entrada)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
