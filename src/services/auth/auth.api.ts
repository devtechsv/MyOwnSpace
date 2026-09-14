import { setCookie } from 'cookies-next';
import {
  ForgotPasswordPayload,
  LoginPayload,
  Session,
  SetPasswordPayload,
} from '@/contracts/interfaces/auth';
import { mockAuthAdapter } from '@/services/mocks/mock-adapter';
import refreshSession from './refresh-session';

// Mientras no exista backend real, la sesión completa (no un JWT
// opaco) viaja como JSON en esta cookie — ver refresh-session.ts, que
// la lee del lado del servidor en cada getServerSideProps protegido.
export const SESSION_COOKIE = 'accessToken';

// 2 horas, según la regla de expiración de sesión de OwnSpace.md. La
// Tarea 9 se encarga de expirar por inactividad; acá se fija el máximo.
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 2;

async function login(payload: LoginPayload): Promise<Session> {
  const session = await mockAuthAdapter.login(payload);
  setCookie(SESSION_COOKIE, JSON.stringify(session), {
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
  return session;
}

async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  return mockAuthAdapter.forgotPassword(payload);
}

async function setPassword(payload: SetPasswordPayload): Promise<void> {
  return mockAuthAdapter.setPassword(payload);
}

const auth = {
  refreshSession,
  login,
  forgotPassword,
  setPassword,
};

export default auth;
