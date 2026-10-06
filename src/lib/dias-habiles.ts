// Fechas de calendario que usan las pantallas (calendario de PTO y
// solicitud por rango). Solo aritmética de días: las reglas de saldo de
// PTO viven en el backend (PtoBalanceCalculator.cs); la copia en
// TypeScript de esas reglas es solo del modo simulado
// (src/services/mocks/pto-balance-calculator.ts).
// Fechas en ISO 8601 (yyyy-mm-dd), operadas en UTC para que el huso del
// navegador no corra el día.
export const HORAS_POR_DIA = 8;

function toUtcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = toUtcDate(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
}

export function esDiaHabil(iso: string): boolean {
  const diaSemana = toUtcDate(iso).getUTCDay();
  return diaSemana !== 0 && diaSemana !== 6;
}

// Lunes a viernes dentro de [desde, hasta], ambos inclusive.
export function contarDiasHabiles(desde: string, hasta: string): number {
  let dias = 0;
  for (let dia = desde; dia <= hasta; dia = sumarDias(dia, 1)) {
    if (esDiaHabil(dia)) dias++;
  }
  return dias;
}
