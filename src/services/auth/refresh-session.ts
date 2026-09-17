import { setCookie } from 'cookies-next';
import { Session } from '@/contracts/interfaces/auth';
import { IncomingMessage, ServerResponse } from 'http';
import {
  COOKIE_MAX_AGE_SECONDS,
  decodeSession,
  encodeSession,
  SESSION_COOKIE,
} from './session-cookie';
import { httpAuthAdapter, SessionCheckResult } from './auth.http-adapter';

export type { SessionCheckResult };

const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';

// Mientras coexisten mock y backend real: en modo mock, la sesión viaja
// como JSON (con su propio expiresAt) en la cookie — ver
// session-cookie.ts y auth.api.ts -> login(). En modo real, el JWT es
// opaco: no hay nada que decodificar acá, la única forma de saber si
// sigue siendo válido es preguntarle al backend.

const refreshSession = async (
  accessToken: string | undefined,
  _refreshToken: string | undefined,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SessionCheckResult> => {
  if (!accessToken) {
    return { status: 'none' };
  }

  if (USE_REAL_API) {
    return httpAuthAdapter.refreshSession(accessToken, res);
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