// Port a TypeScript de OwnSpaceAPI/.../Services/Pto/PtoBalanceCalculator.cs
// — mismo algoritmo, para que el mock pueda replicar el PTO sin backend
// real (ver los comentarios de allá para el detalle de cada regla).
// Fechas siempre en ISO 8601 (yyyy-mm-dd); la comparación lexicográfica
// de esas cadenas ya es cronológica, así que se usa directo donde alcanza
// (mismo criterio que el resto del proyecto, ver mock-adapter.ts).
export const HORAS_POR_QUINCENA = 5;
export const HORAS_POR_DIA = 8;
export const DIAS_TRABAJADOS_MINIMOS = 200;

export interface TramoReclamado {
  corteDesde: string;
  corteHasta: string;
}

export interface Ausencia {
  desde: string;
  hasta: string;
}

export interface EstadoPto {
  horasAcumuladas: number;
  horasReclamadasHabilitadas: number;
  horasReclamadasBloqueadas: number;
  fechaProximaHabilitacion: string;
  diasTrabajadosAnioLaboral: number;
}

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

function fromDate(fecha: Date): string {
  return toIso(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
}

function ultimoDiaDelMes(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = toUtcDate(iso);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fromDate(fecha);
}

// Igual que DateOnly.AddYears de .NET: un 29-feb cae en 28-feb si el año
// destino no es bisiesto.
function sumarAnios(iso: string, anios: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const destino = year + anios;
  return toIso(destino, month - 1, Math.min(day, ultimoDiaDelMes(destino, month - 1)));
}

function max(a: string, b: string): string {
  return a > b ? a : b;
}

function min(a: string, b: string | null | undefined): string {
  return b && b < a ? b : a;
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

// Días hábiles de [inicio, fin] menos los cubiertos por ausencias
// (contados una sola vez aunque se superpongan).
export function diasTrabajados(inicio: string, fin: string, ausencias: Ausencia[]): number {
  const diasAusente = new Set<string>();
  for (const ausencia of ausencias) {
    for (let dia = max(inicio, ausencia.desde); dia <= min(fin, ausencia.hasta); dia = sumarDias(dia, 1)) {
      if (esDiaHabil(dia)) diasAusente.add(dia);
    }
  }
  return contarDiasHabiles(inicio, fin) - diasAusente.size;
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

function limitesAnioLaboral(fechaIngreso: string, anio: number): [string, string] {
  return [sumarAnios(fechaIngreso, anio), sumarDias(sumarAnios(fechaIngreso, anio + 1), -1)];
}

// Quincenas ganadas y sin reclamar, solo del año calendario en curso:
// lo no reclamado de años anteriores ya se perdió (borrado del 1-ene).
export function tramoPendiente(
  fechaIngreso: string,
  fechaDesactivacion: string | null | undefined,
  hoy: string,
  ultimoCorteReclamado: string | null,
): TramoReclamado | null {
  let desde = max(fechaIngreso, `${hoy.slice(0, 4)}-01-01`);
  if (ultimoCorteReclamado && sumarDias(ultimoCorteReclamado, 1) > desde) {
    desde = sumarDias(ultimoCorteReclamado, 1);
  }
  const hasta = min(hoy, fechaDesactivacion);
  return contarQuincenasCompletadas(desde, hasta) > 0 ? { corteDesde: desde, corteHasta: hasta } : null;
}

export function calcularEstadoPto(
  fechaIngreso: string,
  fechaDesactivacion: string | null | undefined,
  hoy: string,
  reclamos: TramoReclamado[],
  ausencias: Ausencia[],
): EstadoPto {
  const ultimoCorte = reclamos.reduce<string | null>(
    (acc, r) => (acc === null || r.corteHasta > acc ? r.corteHasta : acc),
    null,
  );
  const pendiente = tramoPendiente(fechaIngreso, fechaDesactivacion, hoy, ultimoCorte);
  const horasAcumuladas = pendiente
    ? contarQuincenasCompletadas(pendiente.corteDesde, pendiente.corteHasta) * HORAS_POR_QUINCENA
    : 0;

  const aniosCerrados = indicePeriodo(fechaIngreso, hoy);
  let ultimoAnioHabilitado = -1;
  for (let anio = 0; anio < aniosCerrados; anio++) {
    const [inicio, fin] = limitesAnioLaboral(fechaIngreso, anio);
    if (diasTrabajados(inicio, min(fin, fechaDesactivacion), ausencias) >= DIAS_TRABAJADOS_MINIMOS) {
      ultimoAnioHabilitado = anio;
    }
  }

  let habilitadas = 0;
  let bloqueadas = 0;
  for (const reclamo of reclamos) {
    const desdeAnio = indicePeriodo(fechaIngreso, reclamo.corteDesde);
    const hastaAnio = indicePeriodo(fechaIngreso, reclamo.corteHasta);
    for (let anio = desdeAnio; anio <= hastaAnio; anio++) {
      const [inicio, fin] = limitesAnioLaboral(fechaIngreso, anio);
      const horas =
        contarQuincenasCompletadas(max(inicio, reclamo.corteDesde), min(fin, reclamo.corteHasta)) *
        HORAS_POR_QUINCENA;
      if (anio <= ultimoAnioHabilitado) habilitadas += horas;
      else bloqueadas += horas;
    }
  }

  const [inicioActual] = limitesAnioLaboral(fechaIngreso, aniosCerrados);
  return {
    horasAcumuladas,
    horasReclamadasHabilitadas: habilitadas,
    horasReclamadasBloqueadas: bloqueadas,
    fechaProximaHabilitacion: sumarAnios(fechaIngreso, aniosCerrados + 1),
    diasTrabajadosAnioLaboral: diasTrabajados(inicioActual, min(hoy, fechaDesactivacion), ausencias),
  };
}
