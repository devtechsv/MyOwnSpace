import {
  CreateUserPayload,
  UpdateUserPayload,
  User,
} from '@/contracts/interfaces/user';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
  RequestStatus,
} from '@/contracts/interfaces/request';
import {
  ForgotPasswordPayload,
  LoginPayload,
  Session,
  SetPasswordPayload,
} from '@/contracts/interfaces/auth';
import { mockRequests, mockUsers } from './mock-data';

// Este adaptador implementa las mismas firmas que tendrán las llamadas
// reales en auth.api.ts / requests.api.ts / users.api.ts, con un
// pequeño delay simulado y estado en memoria (se pierde al recargar).
// Ningún componente debe importar este módulo directamente — solo los
// futuros *.api.ts, para que cambiar de mock a backend real sea un
// cambio en un solo lugar.
const LATENCY_MS = 150;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), LATENCY_MS);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

let users: User[] = clone(mockUsers);
let requests: LeaveRequest[] = clone(mockRequests);

// Solo para tests: vuelve el estado en memoria a los fixtures originales.
export function resetMockState(): void {
  users = clone(mockUsers);
  requests = clone(mockRequests);
}

function nextId(prefix: string, existing: { id: string }[]): string {
  return `${prefix}${existing.length + 1}`;
}

function findUserOrThrow(id: string): User {
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error(`Usuario ${id} no encontrado`);
  }
  return user;
}

function findRequestOrThrow(id: string): LeaveRequest {
  const request = requests.find((r) => r.id === id);
  if (!request) {
    throw new Error(`Solicitud ${id} no encontrada`);
  }
  return request;
}

async function setRequestEstado(
  id: string,
  estado: RequestStatus,
  reviewerId: string,
): Promise<LeaveRequest> {
  const target = findRequestOrThrow(id);
  target.estado = estado;
  target.reviewedBy = reviewerId;
  target.reviewedAt = new Date().toISOString();
  return delay(clone(target));
}

export const mockAuthAdapter = {
  async login(payload: LoginPayload): Promise<Session> {
    const user = users.find((u) => u.correo === payload.correo);
    if (!user || user.estado === 'Desactivado') {
      // El mock no distingue "no existe" de "desactivado" en el mensaje,
      // igual que hará la API real: nunca se confirma si un correo existe.
      throw new Error('Credenciales inválidas');
    }
    const session: Session = {
      userId: user.id,
      nombre: user.nombre,
      rol: user.rol,
      estado: user.estado,
    };
    return delay(session);
  },

  async forgotPassword(_payload: ForgotPasswordPayload): Promise<void> {
    // Siempre resuelve igual, exista o no el correo (SPEC.md: nunca
    // revelar si un correo está registrado).
    return delay(undefined);
  },

  async setPassword(_payload: SetPasswordPayload): Promise<void> {
    // El mock no valida el token contra un backend real; solo simula
    // que la operación se completó.
    return delay(undefined);
  },
};

export const mockRequestsAdapter = {
  async listByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return delay(clone(requests.filter((r) => r.employeeId === employeeId)));
  },

  async listPending(): Promise<LeaveRequest[]> {
    return delay(clone(requests.filter((r) => r.estado === 'Pendiente')));
  },

  async create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    const nueva: LeaveRequest = {
      id: nextId('r', requests),
      employeeId: payload.employeeId,
      tipo: payload.tipo,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      motivo: payload.motivo,
      estado: 'Pendiente',
      createdAt: new Date().toISOString(),
    };
    requests = [...requests, nueva];
    return delay(clone(nueva));
  },

  async approve(id: string, reviewerId: string): Promise<LeaveRequest> {
    return setRequestEstado(id, 'Aprobada', reviewerId);
  },

  async deny(id: string, reviewerId: string): Promise<LeaveRequest> {
    return setRequestEstado(id, 'Denegada', reviewerId);
  },
};

export const mockUsersAdapter = {
  async list(): Promise<User[]> {
    return delay(clone(users));
  },

  async create(payload: CreateUserPayload): Promise<User> {
    const nuevo: User = {
      id: nextId('u', users),
      nombre: payload.nombre,
      correo: payload.correo,
      rol: payload.rol,
      estado: 'Pendiente',
    };
    users = [...users, nuevo];
    return delay(clone(nuevo));
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const target = findUserOrThrow(id);
    Object.assign(target, payload);
    return delay(clone(target));
  },

  async resetPassword(id: string): Promise<void> {
    const target = findUserOrThrow(id);
    target.estado = 'Pendiente';
    return delay(undefined);
  },

  async toggleStatus(id: string): Promise<User> {
    const target = findUserOrThrow(id);
    target.estado = target.estado === 'Desactivado' ? 'Activo' : 'Desactivado';
    return delay(clone(target));
  },
};
