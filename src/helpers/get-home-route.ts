import { UserRole } from '@/contracts/interfaces/user';

// A dónde mandar a alguien que ya tiene sesión válida: mismo criterio en
// todos lados (login recién hecho, o visitar una página pública —
// /login, /forgot-password, etc. — ya autenticado). Administrador no
// tiene nada que ver en '/' (es la vista de Empleado), así que ir ahí
// le daría 404 por rol incorrecto en vez de una redirección útil.
export function getHomeRoute(rol: UserRole): string {
  return rol === 'Administrador' ? '/admin/requests' : '/';
}
