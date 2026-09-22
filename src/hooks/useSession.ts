import { createContext, useContext } from 'react';
import { Session } from '@/contracts/interfaces/auth';

// with-auth.tsx inyecta `session` en el `props` de cada página que
// envuelve (ver ese archivo); _app.tsx lo toma de pageProps y lo
// expone acá vía contexto, para no tener que hacer prop-drilling
// manual en cada página/componente.
export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session | null {
  return useContext(SessionContext);
}