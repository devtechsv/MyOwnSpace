export type UserRole = 'Empleado' | 'Administrador';

export type UserStatus = 'Pendiente' | 'Activo' | 'Desactivado';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
  estado: UserStatus;
}
