import { User } from './user';

export type RequestType =
  | 'Emergencia'
  | 'Enfermedad'
  | 'Permiso personal'
  | 'Otro';

export type RequestStatus = 'Pendiente' | 'Aprobada' | 'Denegada';

export interface LeaveRequest {
  id: string;
  employeeId: User['id'];
  tipo: RequestType;
  fechaInicio: string; // ISO 8601
  fechaFin: string; // ISO 8601
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
  motivo: string;
}
