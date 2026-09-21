import { User, UserRole, UserStatus } from './user';

export interface LoginPayload {
  correo: string;
  password: string;
}

export interface Session {
  userId: User['id'];
  nombre: string;
  rol: UserRole;
  estado: UserStatus;
  mustChangePassword: boolean;
}

export interface ForgotPasswordPayload {
  correo: string;
}

export interface ChangePasswordPayload {
  passwordActual: string;
  passwordNueva: string;
}
