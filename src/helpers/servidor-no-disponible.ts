import axios from 'axios';

// La API no respondió (caída, sin red, timeout) o falló por su cuenta
// (5xx): no es culpa del usuario ni de su sesión. Un 4xx sí es una
// respuesta real del servidor (sesión vencida, credenciales incorrectas).
// Los errores del mock no son de axios, así que nunca entran aquí.
export function esServidorNoDisponible(err: unknown): boolean {
  return axios.isAxiosError(err) && (!err.response || err.response.status >= 500);
}
