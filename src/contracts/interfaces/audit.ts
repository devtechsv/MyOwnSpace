// GET /audit-logs — bitácora de acciones de administradores (pantalla
// Auditoría). Mismos nombres que el enum AuditAction del backend.
export type AuditAction =
  | 'UsuarioCreado'
  | 'UsuarioEditado'
  | 'ContrasenaReseteada'
  | 'EstadoUsuarioCambiado'
  | 'SolicitudAprobada'
  | 'SolicitudDenegada';

export type AuditEntityType = 'Usuario' | 'Solicitud';

export interface AuditLog {
  id: string;
  actorId: string;
  // Nombre del administrador al momento de la acción.
  actorNombre: string;
  accion: AuditAction;
  entidadTipo: AuditEntityType;
  entidadId: string;
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
