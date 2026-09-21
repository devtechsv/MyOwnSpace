import { User } from './user';

export type RequestType =
  | 'Emergencia'
  | 'Enfermedad'
  | 'Permiso personal'
  | 'Vacaciones'
  | 'Otro';

export type RequestStatus = 'Pendiente' | 'Aprobada' | 'Denegada';

export interface LeaveRequest {
  id: string;
  employeeId: User['id'];
  tipo: RequestType;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  // Opcionales — formato HH:mm. Van juntas o ninguna: una solicitud sin
  // hora es de día completo, igual que antes de agregar este campo.
  horaInicio?: string;
  horaFin?: string;
  // Solo aplica a tipo Vacaciones (módulo de PTO) — 8 (jornada completa)
  // o el valor personalizado que eligió el empleado.
  horasSolicitadas?: number;
  motivo: string;
  estado: RequestStatus;
  createdAt: string; // ISO 8601
  reviewedBy?: User['id'];
  reviewedAt?: string; // ISO 8601
  motivoRechazo?: string;
}

export interface CreateLeaveRequestPayload {
  employeeId: User['id'];
  tipo: RequestType;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
  horaInicio?: string; // HH:mm
  horaFin?: string; // HH:mm
  motivo: string;
}
