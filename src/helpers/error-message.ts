import axios from 'axios';

// Mensaje legible de un error de API: el `detail` del ProblemDetails que
// devuelve el backend (400/404/409) si existe; si no, el del Error (el
// mock lanza Error con el mismo texto que el backend).
export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
    if (typeof detail === 'string' && detail) return detail;
    return fallback;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
