import { setCookie, deleteCookie } from 'cookies-next';
import {
  ForgotPasswordPayload,
  LoginPayload,
  Session,
  SetPasswordPayload,
} from '@/contracts/interfaces/auth';
import { mockAuthAdapter } from '@/services/mocks/mock-adapter';
import { httpAuthAdapter } from './auth.http-adapter';
import refreshSession from './refresh-session';
import {
  COOKIE_MAX_AGE_SECONDS,
  encodeSession,
  SESSION_COOKIE,
} from './session-cookie';

export { SESSION_COOKIE };

const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';

async function login(payload: LoginPayload): Promise<Session> {
  if (USE_REAL_API){
    //Backend asigna la cookie httpOnly vía Set-cookie.
    return httpAuthAdapter.login(payload);
  }

  const session = await mockAuthAdapter.login(payload);
  setCookie(SESSION_COOKIE, encodeSession(session), {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return session;
}

async function logout(): Promise<void> {
  if (USE_REAL_API) {
    // Hay que esperar la respuesta: la cookie la borra el backend vía
    // Set-Cookie. Si no se espera, el navegador puede navegar a /login
    // con la cookie vieja todavía viva — /login ve sesión "válida",
    // redirige a / y el rol no calza ahí, terminando en 404 en vez de
    // en el login. (Bug real observado en prueba manual.)
    await httpAuthAdapter.logout();
    return;
  }
  deleteCookie(SESSION_COOKIE, { path: '/' });
}

async function forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
  const adapter = USE_REAL_API ? httpAuthAdapter : mockAuthAdapter;
  return adapter.forgotPassword(payload);
}

async function setPassword(payload: SetPasswordPayload): Promise<void> {
  const adapter = USE_REAL_API ? httpAuthAdapter : mockAuthAdapter;
  return adapter.setPassword(payload);
}

const auth = {
  refreshSession,
  login,
  logout,
  forgotPassword,
  setPassword,
};

export default auth;
