// "Hoy" como yyyy-mm-dd en la hora local del navegador. No usar
// new Date().toISOString().slice(0, 10): eso es la fecha en UTC, y desde
// las 6 p. m. en El Salvador ya da el día siguiente.
export function hoyIso(fecha: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
}
