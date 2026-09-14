import { Session } from '@/contracts/interfaces/auth';
import { IncomingMessage, ServerResponse } from 'http';

// Mientras no exista un backend real, la sesión viaja directamente como
// JSON en la cookie `accessToken` (la escribe auth.api.ts -> login()),
// en vez de un JWT opaco que se verificaría contra un servidor. Cuando
// el backend exista, esta función vuelve a llamar a AuthEndpoints.VERIFY
// — el resto de la app (withAuth, páginas) no necesita cambiar, porque
// sigue recibiendo un `Session | null` como hasta ahora.
const refreshSession = async (
  accessToken: string | undefined,
  _refreshToken: string | undefined,
  _req: IncomingMessage,
  _res: ServerResponse,
): Promise<Session | null> => {
  if (!accessToken) {
    return null;
  }

  try {
    return JSON.parse(accessToken) as Session;
  } catch {
    return null;
  }
};

export default refreshSession;
