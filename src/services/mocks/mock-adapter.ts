import {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserStats,
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
import {
  CreatePtoRequestPayload,
  CreateVacationRequestPayload,
  PtoBalance,
} from '@/contracts/interfaces/pto';
import {
  calcularEstadoPto,
  contarDiasHabiles,
  DIAS_TRABAJADOS_MINIMOS,
  esDiaHabil,
  HORAS_POR_DIA,
  TramoReclamado,
  tramoPendiente,
} from '@/lib/pto-balance-calculator';
import { isPasswordValid } from '@/lib/password-rules';
import { mockPtoClaims, mockRequests, mockUsers } from './mock-data';

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
let ptoClaims: (TramoReclamado & { employeeId: string })[] = clone(mockPtoClaims);

// Solo para tests: vuelve el estado en memoria a los fixtures originales.
export function resetMockState(): void {
  users = clone(mockUsers);
  requests = clone(mockRequests);
  ptoClaims = clone(mockPtoClaims);
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
  if (
    estado === 'Aprobada' &&
    target.tipo === 'Vacaciones' &&
    (target.horasSolicitadas ?? 0) > disponiblePto(target.employeeId, target.id)
  ) {
    throw new Error('El empleado ya no tiene horas disponibles suficientes para estas vacaciones.');
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
  async listByEmployee(employeeId: string, params: RequestsListParams): Promise<PagedResult<LeaveRequest>> {
    // Descendente (más nueva primero) — igual que RequestsService.ListMineAsync.
    const propias = requests
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return delay(clone(filtrarYPaginar(propias, params)));
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
      throw new Error('Si ingresas hora de inicio, también hace falta la hora de fin (y viceversa).');
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
  async list(page: number, pageSize: number): Promise<PagedResult<User>> {
    const ordenados = [...users].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const totalCount = ordenados.length;
    const paginaSegura = Math.max(1, page);
    const tamañoSeguro = Math.max(1, pageSize);
    const start = (paginaSegura - 1) * tamañoSeguro;
    return delay({
      items: clone(ordenados.slice(start, start + tamañoSeguro)),
      totalCount,
      page: paginaSegura,
      pageSize: tamañoSeguro,
    });
  },

  async stats(): Promise<UserStats> {
    return delay({
      total: users.length,
      activos: users.filter((u) => u.estado === 'Activo').length,
      pendientes: users.filter((u) => u.estado === 'Pendiente').length,
    });
  },

  async create(payload: CreateUserPayload): Promise<User> {
    // Igual que el backend real: una contraseña manual inválida se
    // rechaza antes de crear nada.
    if (payload.password !== undefined && !isPasswordValid(payload.password)) {
      throw new Error('La contraseña no cumple los requisitos mínimos.');
    }
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

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Mismo cálculo que PtoBalanceService del backend.
function estadoPto(employeeId: string) {
  const user = findUserOrThrow(employeeId);
  const ausencias = requests
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.tipo !== 'Vacaciones' &&
        r.estado === 'Aprobada' &&
        !r.horaInicio,
    )
    .map((r) => ({ desde: r.fechaInicio, hasta: r.fechaFin }));
  return calcularEstadoPto(
    user.fechaIngreso,
    user.fechaDesactivacion,
    hoyIso(),
    ptoClaims.filter((c) => c.employeeId === employeeId),
    ausencias,
  );
}

// Reclamadas y habilitadas menos vacaciones aprobadas y pendientes (las
// pendientes apartan saldo). excluirId: al aprobar una pendiente.
function disponiblePto(employeeId: string, excluirId?: string): number {
  const consumidas = requests
    .filter(
      (r) =>
        r.employeeId === employeeId &&
        r.tipo === 'Vacaciones' &&
        (r.estado === 'Aprobada' || r.estado === 'Pendiente') &&
        r.id !== excluirId,
    )
    .reduce((acc, r) => acc + (r.horasSolicitadas ?? 0), 0);
  return Math.max(0, estadoPto(employeeId).horasReclamadasHabilitadas - consumidas);
}

function hayVacacionesEn(employeeId: string, desde: string, hasta: string): boolean {
  return requests.some(
    (r) =>
      r.employeeId === employeeId &&
      r.tipo === 'Vacaciones' &&
      (r.estado === 'Aprobada' || r.estado === 'Pendiente') &&
      r.fechaInicio <= hasta &&
      r.fechaFin >= desde,
  );
}

function balance(employeeId: string): PtoBalance {
  const estado = estadoPto(employeeId);
  return {
    horasDisponibles: disponiblePto(employeeId),
    horasAcumuladas: estado.horasAcumuladas,
    horasReclamadasBloqueadas: estado.horasReclamadasBloqueadas,
    fechaProximaHabilitacion: estado.fechaProximaHabilitacion,
    diasTrabajadosAnioLaboral: estado.diasTrabajadosAnioLaboral,
    diasTrabajadosMinimos: DIAS_TRABAJADOS_MINIMOS,
    fechaLimiteReclamo: `${hoyIso().slice(0, 4)}-12-31`,
  };
}

export const mockPtoAdapter = {
  async getBalance(employeeId: string): Promise<PtoBalance> {
    return delay(balance(employeeId));
  },

  async claim(employeeId: string): Promise<PtoBalance> {
    const user = findUserOrThrow(employeeId);
    const ultimoCorte = ptoClaims
      .filter((c) => c.employeeId === employeeId)
      .reduce<string | null>((acc, c) => (acc === null || c.corteHasta > acc ? c.corteHasta : acc), null);
    const tramo = tramoPendiente(user.fechaIngreso, user.fechaDesactivacion, hoyIso(), ultimoCorte);
    if (!tramo) {
      throw new Error('No tienes horas acumuladas para reclamar.');
    }
    ptoClaims = [...ptoClaims, { employeeId, ...tramo }];
    return delay(balance(employeeId));
  },

  async create(employeeId: string, payload: CreatePtoRequestPayload): Promise<LeaveRequest> {
    // Mismas reglas que el backend real (PtoRequestsService.CrearAsync).
    if (payload.horas <= 0 || payload.horas > HORAS_POR_DIA) {
      throw new Error(
        'Las horas tienen que ser mayores a 0 y no pueden superar 8 (jornada completa).',
      );
    }
    if (hayVacacionesEn(employeeId, payload.fecha, payload.fecha)) {
      throw new Error('Ya tienes PTO reservado para esa fecha.');
    }
    if (payload.horas > disponiblePto(employeeId)) {
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

  async createVacationRequest(
    employeeId: string,
    payload: CreateVacationRequestPayload,
  ): Promise<LeaveRequest> {
    // Mismas reglas que el backend real (PtoRequestsService.SolicitarRangoAsync).
    const { fechaInicio, fechaFin } = payload;
    if (fechaFin < fechaInicio) {
      throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
    }
    if (fechaInicio < hoyIso()) {
      throw new Error('No puedes solicitar vacaciones en fechas pasadas.');
    }
    if (!esDiaHabil(fechaInicio)) {
      throw new Error('Las vacaciones no pueden iniciar en sábado ni domingo.');
    }
    if (hayVacacionesEn(employeeId, fechaInicio, fechaFin)) {
      throw new Error('Ya tienes vacaciones solicitadas o reservadas en esas fechas.');
    }
    const horas = contarDiasHabiles(fechaInicio, fechaFin) * HORAS_POR_DIA;
    const disponible = disponiblePto(employeeId);
    if (horas > disponible) {
      throw new Error(
        `No tienes horas suficientes: necesitas ${horas}h y tienes ${disponible}h disponibles.`,
      );
    }

    const nueva: LeaveRequest = {
      id: nextId('r', requests),
      employeeId,
      tipo: 'Vacaciones',
      fechaInicio,
      fechaFin,
      horasSolicitadas: horas,
      motivo: payload.motivo?.trim() || 'Vacaciones — solicitud por rango',
      estado: 'Pendiente',
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

