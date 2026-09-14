import { Session } from '@/contracts/interfaces/auth';

export const SESSION_COOKIE = 'accessToken';

// Duración real de la sesión por inactividad (regla de OwnSpace.md: "que
// permita... tokens que duren dos horas de sesión, si en caso hay mucha
// inactividad"). Se renueva en cada verificación exitosa dentro de una
// ruta protegida (ver refresh-session.ts), así que un usuario activo
// nunca la ve vencer — solo expira si deja de navegar por 2 horas.
export const SESSION_TTL_MS = 60 * 60 * 2 * 1000;

// El cookie técnico dura mucho más que la sesión funcional. Si lo
// hiciéramos expirar exactamente a las 2h, el navegador lo borraría
// solo y perderíamos la forma de distinguir "sesión vencida por
// inactividad" de "nunca inició sesión" — la única señal que tenemos
// para decidir si el login muestra el aviso correspondiente.
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface StoredSession extends Session {
  expiresAt: number; // epoch ms
}

export function encodeSession(session: Session): string {
  const stored: StoredSession = {
    ...session,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  return JSON.stringify(stored);
}

export function decodeSession(raw: string): StoredSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}
