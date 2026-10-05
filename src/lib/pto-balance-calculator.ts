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

// Periodos anuales por aniversario de ingreso, con desfase de un año: lo
// devengado en un periodo se usa en el siguiente (el primer año no hay
// nada disponible) y lo no usado se pierde al cerrar el periodo. Misma
// lógica que PtoBalanceCalculator.cs — ver los comentarios de allá.

// Igual que DateOnly.AddYears de .NET: un 29-feb cae en 28-feb si el
// año destino no es bisiesto.
function sumarAnios(iso: string, anios: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const destino = year + anios;
  return toIso(destino, month - 1, Math.min(day, ultimoDiaDelMes(destino, month - 1)));
}

function restarUnDia(iso: string): string {
  const fecha = toUtcDate(iso);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return toIso(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
}

function indicePeriodo(fechaIngreso: string, fecha: string): number {
  let anios = Number(fecha.slice(0, 4)) - Number(fechaIngreso.slice(0, 4));
  if (sumarAnios(fechaIngreso, anios) > fecha) {
    anios--;
  }
  return Math.max(0, anios);
}

export function inicioPeriodo(fechaIngreso: string, fecha: string): string {
  return sumarAnios(fechaIngreso, indicePeriodo(fechaIngreso, fecha));
}

export function finPeriodoExclusivo(fechaIngreso: string, fecha: string): string {
  return sumarAnios(fechaIngreso, indicePeriodo(fechaIngreso, fecha) + 1);
}

function horasDevengadas(
  inicio: string,
  finExclusivo: string,
  fechaDesactivacion: string | null | undefined,
  hoy: string,
): number {
  let fin = restarUnDia(finExclusivo);
  if (hoy < fin) fin = hoy;
  if (fechaDesactivacion && fechaDesactivacion < fin) fin = fechaDesactivacion;
  return contarQuincenasCompletadas(inicio, fin) * HORAS_POR_QUINCENA;
}

// Horas usables en el periodo que contiene `fecha`: lo devengado en el
// periodo anterior, congelado en hoy o en la desactivación.
export function calcularHorasDisponibles(
  fechaIngreso: string,
  fechaDesactivacion: string | null | undefined,
  fecha: string,
  hoy: string,
): number {
  const indice = indicePeriodo(fechaIngreso, fecha);
  if (indice === 0) {
    return 0;
  }
  return horasDevengadas(
    sumarAnios(fechaIngreso, indice - 1),
    sumarAnios(fechaIngreso, indice),
    fechaDesactivacion,
    hoy,
  );
}

// Lo que se va devengando en el periodo vigente — solo se libera en el
// próximo aniversario.
export function calcularHorasEnAcumulacion(
  fechaIngreso: string,
  fechaDesactivacion: string | null | undefined,
  hoy: string,
): number {
  return horasDevengadas(
    inicioPeriodo(fechaIngreso, hoy),
    finPeriodoExclusivo(fechaIngreso, hoy),
    fechaDesactivacion,
    hoy,
  );
}
