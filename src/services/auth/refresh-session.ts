import { setCookie } from 'cookies-next';
import { Session } from '@/contracts/interfaces/auth';
import { IncomingMessage, ServerResponse } from 'http';
import {
  COOKIE_MAX_AGE_SECONDS,
  decodeSession,
  encodeSession,
  SESSION_COOKIE,
} from './session-cookie';

export type SessionCheckResult =
  | { status: 'valid'; session: Session }
  | { status: 'expired' }
  | { status: 'none' };

// Mientras no exista un backend real, la sesión viaja como JSON (con su
// propio `expiresAt`) en la cookie `accessToken` — ver session-cookie.ts
// y auth.api.ts -> login(). Cada verificación exitosa renueva esa fecha
// +2h reescribiendo la misma cookie, así la sesión expira por
// inactividad y no por un plazo fijo. Cuando el backend exista, esta
// función vuelve a verificar contra AuthEndpoints.VERIFY — el resto de
// la app (withAuth, páginas) no cambia, porque sigue recibiendo el
// mismo resultado de tres estados.
const refreshSession = async (
  accessToken: string | undefined,
  _refreshToken: string | undefined,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SessionCheckResult> => {
  if (!accessToken) {
    return { status: 'none' };
  }

  const stored = decodeSession(accessToken);
  if (!stored) {
    return { status: 'none' };
  }

  if (Date.now() > stored.expiresAt) {
    return { status: 'expired' };
  }

  const { expiresAt: _expiresAt, ...session } = stored;

  setCookie(SESSION_COOKIE, encodeSession(session), {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
    req,
    res,
  });

  return { status: 'valid', session };
};

export default refreshSession;
