import { setCookie, deleteCookie } from 'cookies-next';
import {
  ForgotPasswordPayload,
  LoginPayload,
  Session,
  SetPasswordPayload,
} from '@/contracts/interfaces/auth';
import { mockAuthAdapter } from '@/services/mocks/mock-adapter';
import refreshSession from './refresh-session';
import {
  COOKIE_MAX_AGE_SECONDS,
  encodeSession,
  SESSION_COOKIE,
} from './session-cookie';

export { SESSION_COOKIE };

async function login(payload: LoginPayload): Promise<Session> {
  const session = await mockAuthAdapter.login(payload);
  setCookie(SESSION_COOKIE, encodeSession(session), {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return session;
}

function logout(): void {
  deleteCookie(SESSION_COOKIE, { path: '/' });
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
  logout,
  forgotPassword,
  setPassword,
};

export default auth;
