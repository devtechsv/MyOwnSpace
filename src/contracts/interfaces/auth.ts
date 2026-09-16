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
}

export interface ForgotPasswordPayload {
  correo: string;
}

export interface SetPasswordPayload {
  token: string;
  nuevaPassword: string;
}
