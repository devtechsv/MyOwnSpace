// Centraliza la decisión mock/real y la vuelve imposible de saltear en
// un build de producción: si NEXT_PUBLIC_USE_REAL_API no está en 'true'
// cuando NODE_ENV=production, revienta apenas se importa este módulo.
// El modo mock no verifica contraseña y guarda la sesión en una cookie
// sin firmar — no puede llegar a producción por un env var olvidado.
export const USE_REAL_API = process.env.NEXT_PUBLIC_USE_REAL_API === 'true';

if (process.env.NODE_ENV === 'production' && !USE_REAL_API) {
  throw new Error(
    'NEXT_PUBLIC_USE_REAL_API debe ser "true" en un build de producción — el modo mock no puede llegar a producción.',
  );
}
