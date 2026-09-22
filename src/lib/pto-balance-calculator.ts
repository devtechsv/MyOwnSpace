// Port a TypeScript de OwnSpaceAPI/.../Services/Pto/PtoBalanceCalculator.cs
// — mismo algoritmo, para que el mock pueda replicar la fórmula de
// devengo/balance de PTO sin backend real. Fechas siempre en ISO
// 8601 (yyyy-mm-dd); la comparación lexicográfica de esas cadenas ya
// es cronológica, así que se usa directo donde alcanza (mismo criterio
// que el resto del proyecto, ver mock-adapter.ts).
const HORAS_POR_QUINCENA = 5;

function toUtcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toIso(year: number, monthZeroBased: number, day: number): string {
  return `${year}-${pad(monthZeroBased + 1)}-${pad(day)}`;
}

function ultimoDiaDelMes(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

// Una quincena se considera devengada en su corte: el día 15 de cada
// mes, y el último día de cada mes. Cuenta los cortes que caen dentro
// de [inicio, fin] (ambos inclusive).
export function contarQuincenasCompletadas(inicioIso: string, finIso: string): number {
  const inicio = toUtcDate(inicioIso);
  const fin = toUtcDate(finIso);
  if (fin < inicio) {
    return 0;
  }

  let contador = 0;
  let year = inicio.getUTCFullYear();
  let month = inicio.getUTCMonth();

  while (new Date(Date.UTC(year, month, 1)) <= fin) {
    const corteMediados = new Date(Date.UTC(year, month, 15));
    const corteFinDeMes = new Date(Date.UTC(year, month, ultimoDiaDelMes(year, month)));

    if (corteMediados >= inicio && corteMediados <= fin) {
      contador++;
    }
    if (corteFinDeMes >= inicio && corteFinDeMes <= fin) {
      contador++;
    }

    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
  }

  return contador;
}

// El devengo arranca en la fecha de ingreso o el 1 de enero del año en
// curso (lo que sea más tarde), y se congela en la fecha de
// desactivación o en hoy (lo que sea más temprano).
export function calcularHorasAcumuladas(
  fechaIngreso: string,
  fechaDesactivacion: string | null | undefined,
  hoy: string,
): number {
  const hoyDate = toUtcDate(hoy);
  const primeroDeEnero = toIso(hoyDate.getUTCFullYear(), 0, 1);
  const inicioDevengo = fechaIngreso > primeroDeEnero ? fechaIngreso : primeroDeEnero;
  const finDevengo =
    fechaDesactivacion && fechaDesactivacion < hoy ? fechaDesactivacion : hoy;

  return contarQuincenasCompletadas(inicioDevengo, finDevengo) * HORAS_POR_QUINCENA;
}
