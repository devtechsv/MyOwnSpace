import axios from 'axios';

// 429 del rate limiter del backend (política "auth" de Program.cs: login,
// olvidé mi contraseña y cambio de contraseña comparten el cupo por IP).
// No dice nada de la cuenta, así que se puede mostrar tal cual: tratarlo
// como "contraseña incorrecta" hacía que el usuario reintentara y siguiera
// gastando el cupo.
export const MENSAJE_DEMASIADOS_INTENTOS =
  'Hubo demasiados intentos seguidos desde tu red. Espera un minuto e inténtalo de nuevo.';

export function esDemasiadosIntentos(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 429;
}
