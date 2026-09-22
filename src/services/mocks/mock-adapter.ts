import {
  CreateUserPayload,
  UpdateUserPayload,
  User,
} from '@/contracts/interfaces/user';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
  RequestStatus,
  RequestsListParams,
} from '@/contracts/interfaces/request';
import { PagedResult } from '@/contracts/interfaces/common';
import {
  ForgotPasswordPayload,
  LoginPayload,
  Session,
  ChangePasswordPayload
} from '@/contracts/interfaces/auth';
import { CreatePtoRequestPayload, PtoBalance } from '@/contracts/interfaces/pto';
import { calcularHorasAcumuladas } from '@/lib/pto-balance-calculator';
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
  const max = existing.reduce((acc, item) =>{
    const n = Number(item.id.slice(prefix.length));
    return Number.isFinite(n) && n > acc ? n: acc;

  }, 0);
  return `${prefix}${max + 1}`;
}

function findUserOrThrow(id: string): User {
  const user = users.find((u) => u.id === id);
  if (!user) {
    throw new Error(`Usuario ${id} no encontrado`);
  }
  return user;
}

// Igual que el backend real (RequestsService.ListMineAsync/ListPendingAsync/
// ListAllAsync con .Include(r => r.Employee)): resuelve el nombre del
// empleado en el mismo lugar que arma la lista, en vez de que el
// consumidor (useAdminRequests) tenga que pedir todos los usuarios aparte
// para armar el join a mano.
function withEmployeeNombre(r: LeaveRequest): LeaveRequest {
  return { ...r, employeeNombre: users.find((u) => u.id === r.employeeId)?.nombre };
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
  motivoRechazo?: string,
): Promise<LeaveRequest> {
  const target = findRequestOrThrow(id);
  if (target.estado !== 'Pendiente') {
    // Igual que el backend real (409): una solicitud ya revisada no se
    // puede volver a aprobar/denegar.
    throw new Error('La solicitud ya no está Pendiente.');
  }
  target.estado = estado;
  target.reviewedBy = reviewerId;
  target.reviewedAt = new Date().toISOString();
  if (motivoRechazo !== undefined) {
    target.motivoRechazo = motivoRechazo;
  }
  return delay(clone(target));
}

export const mockAuthAdapter = {
  async login(payload: LoginPayload): Promise<Session> {
    const correoNormalizado = payload.correo.trim().toLowerCase();
    const user = users.find((u) => u.correo.toLowerCase() === correoNormalizado);
    if (!user || user.estado !== 'Activo') {
      // El mock no distingue "no existe" de "no está Activo" en el
      // mensaje, igual que hará la API real: nunca se confirma si un
      // correo existe ni por qué falló (Desactivado y Pendiente
      // rechazan igual que en el backend).
      throw new Error('Credenciales inválidas');
    }
    const session: Session = {
      userId: user.id,
      nombre: user.nombre,
      rol: user.rol,
      estado: user.estado,
      mustChangePassword: user.mustChangePassword ?? false,
    };
    return delay(session);
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    // Siempre resuelve igual, exista o no el correo (SPEC.md: nunca
    // revelar si un correo está registrado) — pero si existe, simula la
    // contraseña temporal real: queda Activo y con mustChangePassword.
    const correoNormalizado = payload.correo.trim().toLowerCase();
    const user = users.find((u) => u.correo.toLowerCase() === correoNormalizado);
    if (user && user.estado !== 'Desactivado') {
      user.estado = 'Activo';
      user.mustChangePassword = true;
      user.contrasenaAsignada = true;
    }
    return delay(undefined);
  },

  async changePassword(_payload: ChangePasswordPayload): Promise<void> {
    // El mock no tiene forma de saber quién está logueado (la sesión
    // vive en una cookie fuera de este módulo, no en `users`) ni
    // contraseñas reales para validar la "actual" — siempre resuelve,
    // igual que forgotPassword. La limpieza real de mustChangePassword
    // pasa server-side contra el backend real.
    return delay(undefined);
  },
};

// Mismos 3 filtros que RequestsService.AplicarFiltros del backend real,
// más Skip/Take — para que el mock se comporte igual que la API paginada.
function filtrarYPaginar(items: LeaveRequest[], params: RequestsListParams): PagedResult<LeaveRequest> {
  let filtrados = items;
  if (params.tipo) {
    filtrados = filtrados.filter((r) => r.tipo === params.tipo);
  }
  if (params.fecha) {
    const fecha = params.fecha;
    filtrados = filtrados.filter(
      (r) => r.fechaInicio.slice(0, 10) <= fecha && fecha <= r.fechaFin.slice(0, 10),
    );
  }
  if (params.nombre) {
    const query = params.nombre.trim().toLowerCase();
    filtrados = filtrados.filter((r) => (r.employeeNombre ?? '').toLowerCase().includes(query));
  }

  const totalCount = filtrados.length;
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  const start = (page - 1) * pageSize;

  return { items: filtrados.slice(start, start + pageSize), totalCount, page, pageSize };
}

export const mockRequestsAdapter = {
  async listByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return delay(clone(requests.filter((r) => r.employeeId === employeeId)));
  },

  async listPending(params: RequestsListParams): Promise<PagedResult<LeaveRequest>> {
    // Ascendente (más vieja primero) — igual que RequestsService.ListPendingAsync.
    const pendientes = requests
      .filter((r) => r.estado === 'Pendiente')
      .map(withEmployeeNombre)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return delay(clone(filtrarYPaginar(pendientes, params)));
  },

  async listAll(estado: RequestStatus | undefined, params: RequestsListParams): Promise<PagedResult<LeaveRequest>> {
    // Descendente (más nueva primero) — igual que RequestsService.ListAllAsync.
    const base = (estado ? requests.filter((r) => r.estado === estado) : requests)
      .map(withEmployeeNombre)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return delay(clone(filtrarYPaginar(base, params)));
  },

  async create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    if (payload.tipo === 'Vacaciones') {
      // Igual que el backend real: Vacaciones tiene su propio flujo de
      // autoservicio (mockPtoAdapter.create) — este camino genérico la
      // rechaza para que nadie la cree esquivando el chequeo de balance.
      throw new Error('Vacaciones se gestiona exclusivamente desde /pto/requests.');
    }
    if (payload.fechaFin < payload.fechaInicio) {
      // Igual que el backend real: rechaza un rango de fechas invertido.
      throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
    if (Boolean(payload.horaInicio) !== Boolean(payload.horaFin)) {
      throw new Error('Si cargás hora de inicio, también hace falta la hora de fin (y viceversa).');
    }
    if (
      payload.horaInicio &&
      payload.horaFin &&
      payload.fechaInicio === payload.fechaFin &&
      payload.horaFin <= payload.horaInicio
    ) {
      throw new Error('La hora de fin no puede ser anterior o igual a la hora de inicio.');
    }
    const nueva: LeaveRequest = {
      id: nextId('r', requests),
      employeeId: payload.employeeId,
      tipo: payload.tipo,
      fechaInicio: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      horaInicio: payload.horaInicio,
      horaFin: payload.horaFin,
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

  async deny(id: string, reviewerId: string, motivo: string): Promise<LeaveRequest> {
    return setRequestEstado(id, 'Denegada', reviewerId, motivo);
  },
};

export const mockUsersAdapter = {
  async list(): Promise<User[]> {
    return delay(clone(users));
  },

  async create(payload: CreateUserPayload): Promise<User> {
    const yaExiste = users.some(
      (u) => u.correo.toLowerCase() === payload.correo.toLowerCase(),
    );
    if (yaExiste) {
      throw new Error('Ya existe un usuario con ese correo.');
    }
    const nuevo: User = {
      id: nextId('u', users),
      nombre: payload.nombre,
      correo: payload.correo,
      rol: payload.rol,
      estado: 'Pendiente',
      fechaIngreso: payload.fechaIngreso,
    };
    users = [...users, nuevo];
    return delay(clone(nuevo));
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const target = findUserOrThrow(id);
    if (payload.correo){
      const yaExiste = users.some(
        (u) =>
          u.id !== id && u.correo.toLowerCase() === payload.correo!.toLowerCase(),
      );
      if (yaExiste){
        throw new Error('Ya existe un usuario con el correo ingresado.');
      }
    }
    Object.assign(target, payload);
    return delay(clone(target));
  },

  async resetPassword(id: string): Promise<void> {
    // Igual que el backend real: emite una temporal directamente, sin
    // paso intermedio por Pendiente.
    const target = findUserOrThrow(id);
    target.estado = 'Activo';
    target.mustChangePassword = true;
    target.contrasenaAsignada = true;
    return delay(undefined);
  },

  async toggleStatus(id: string): Promise<User> {
    const target = findUserOrThrow(id);

    if (target.estado === 'Pendiente' || target.estado === 'Activo') {
      target.estado = 'Desactivado';
      // Igual que el backend real: congela el devengo de PTO.
      target.fechaDesactivacion = new Date().toISOString().slice(0, 10);
    } else {
      // Reactivar: igual que el backend real (PasswordHash null) — si
      // nunca tuvo una contraseña real asignada, vuelve a Pendiente en
      // vez de Activo, porque no tiene con qué loguearse todavía.
      target.estado = target.contrasenaAsignada ? 'Activo' : 'Pendiente';
      target.fechaDesactivacion = undefined;
    }

    return delay(clone(target));
  },
};

export const mockPtoAdapter = {
  async getBalance(employeeId: string): Promise<PtoBalance> {
    const user = findUserOrThrow(employeeId);
    const hoy = new Date().toISOString().slice(0, 10);
    const acumuladas = calcularHorasAcumuladas(
      user.fechaIngreso,
      user.fechaDesactivacion,
      hoy,
    );
    const consumidas = requests
      .filter(
        (r) =>
          r.employeeId === employeeId &&
          r.tipo === 'Vacaciones' &&
          r.estado === 'Aprobada' &&
          r.fechaInicio.slice(0, 4) === hoy.slice(0, 4),
      )
      .reduce((acc, r) => acc + (r.horasSolicitadas ?? 0), 0);
    return delay({ horasDisponibles: Math.max(0, acumuladas - consumidas) });
  },

  async create(employeeId: string, payload: CreatePtoRequestPayload): Promise<LeaveRequest> {
    // Mismas 3 reglas que el backend real (PtoRequestsService.CrearAsync).
    if (payload.horas <= 0 || payload.horas > 8) {
      throw new Error(
        'Las horas tienen que ser mayores a 0 y no pueden superar 8 (jornada completa).',
      );
    }
    const yaReservado = requests.some(
      (r) =>
        r.employeeId === employeeId &&
        r.tipo === 'Vacaciones' &&
        r.estado === 'Aprobada' &&
        r.fechaInicio === payload.fecha,
    );
    if (yaReservado) {
      throw new Error('Ya tienes PTO reservado para esa fecha.');
    }
    const { horasDisponibles } = await mockPtoAdapter.getBalance(employeeId);
    if (payload.horas > horasDisponibles) {
      throw new Error('No tienes balance de PTO suficiente para esa cantidad de horas.');
    }

    const nueva: LeaveRequest = {
      id: nextId('r', requests),
      employeeId,
      tipo: 'Vacaciones',
      fechaInicio: payload.fecha,
      fechaFin: payload.fecha,
      horasSolicitadas: payload.horas,
      motivo: 'Vacaciones — autoservicio (sin motivo)',
      estado: 'Aprobada',
      createdAt: new Date().toISOString(),
    };
    requests = [...requests, nueva];
    return delay(clone(nueva));
  },

  async listCalendario(): Promise<LeaveRequest[]> {
    return delay(
      clone(requests.filter((r) => r.tipo === 'Vacaciones' && r.estado === 'Aprobada')),
    );
  },
};
