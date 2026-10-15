// GET /audit-logs — bitácora de acciones de administradores y de inicios y
// cierres de sesión (pantalla Auditoría). Mismos nombres que el enum
// AuditAction del backend.
export type AuditAction =
  | 'UsuarioCreado'
  | 'UsuarioEditado'
  | 'ContrasenaReseteada'
  | 'EstadoUsuarioCambiado'
  | 'SolicitudAprobada'
  | 'SolicitudDenegada'
  | 'InicioSesion'
  | 'InicioSesionFallido'
  | 'CierreSesion';

export type AuditEntityType = 'Usuario' | 'Solicitud';

export interface AuditLog {
  id: string;
  // null en un inicio de sesión fallido.
  actorId: string | null;
  // Nombre del actor al momento de la acción; "(desconocido)" en un inicio
  // de sesión fallido.
  actorNombre: string;
  accion: AuditAction;
  entidadTipo: AuditEntityType;
  // null en un inicio de sesión fallido con un correo no registrado.
  entidadId: string | null;
  // Nombre actual del usuario afectado o del empleado dueño de la
  // solicitud; null si ya no existe.
  entidadNombre?: string | null;
  detalle?: string | null;
  // ISO en UTC.
  createdAt: string;
}

export interface AuditLogsListParams {
  accion?: AuditAction;
  // yyyy-mm-dd, días en hora de El Salvador, ambos incluidos.
  desde?: string;
  hasta?: string;
  page: number;
  pageSize: number;
}
