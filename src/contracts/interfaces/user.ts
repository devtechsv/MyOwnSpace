export type UserRole = 'Empleado' | 'Administrador';

export type UserStatus = 'Pendiente' | 'Activo' | 'Desactivado';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
  estado: UserStatus;
  // Cargado por el admin al dar de alta — campo real que expone el
  // backend (UserResponse.FechaIngreso), punto de partida del devengo
  // de PTO de esa persona.
  fechaIngreso: string; // ISO 8601 (yyyy-mm-dd)
  // Mock-only, mismo criterio que mustChangePassword: el backend real
  // nunca expone esto en UserResponse (es un detalle interno del
  // cálculo de balance de PTO, ver PtoBalanceCalculator) — el mock lo
  // necesita para poder replicar esa fórmula de punta a punta.
  fechaDesactivacion?: string;
  // Opcional a propósito: el backend real (GET /users) no lo expone —
  // es una preocupación de la sesión del propio usuario, no algo que el
  // admin necesite ver de otros. Solo lo usa el mock, para simular
  // forgotPassword/resetPassword de punta a punta sin backend real.
  mustChangePassword?: boolean;
}

export interface CreateUserPayload {
  nombre: string;
  correo: string;
  rol: UserRole;
  fechaIngreso: string; // ISO 8601 (yyyy-mm-dd)
}

export type UpdateUserPayload = Partial<
  Pick<User, 'nombre' | 'correo' | 'rol'>
>;
