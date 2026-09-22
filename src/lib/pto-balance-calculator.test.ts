import { calcularHorasAcumuladas, contarQuincenasCompletadas } from './pto-balance-calculator';

describe('contarQuincenasCompletadas', () => {
  it('cuenta los 2 cortes de un mes completo', () => {
    expect(contarQuincenasCompletadas('2026-01-01', '2026-01-31')).toBe(2);
  });

  it('cuenta 0 antes del primer corte', () => {
    expect(contarQuincenasCompletadas('2026-01-01', '2026-01-14')).toBe(0);
  });

  it('cuenta el corte justo en el límite', () => {
    expect(contarQuincenasCompletadas('2026-01-01', '2026-01-15')).toBe(1);
  });

  it('devuelve 0 si el fin es anterior al inicio', () => {
    expect(contarQuincenasCompletadas('2026-03-01', '2026-01-01')).toBe(0);
  });
});

describe('calcularHorasAcumuladas', () => {
  it('con ingreso antes de enero, cuenta desde el 1 de enero del año en curso', () => {
    const horas = calcularHorasAcumuladas('2020-01-01', null, '2026-01-31');
    // Devengo arranca el 1-ene-2026 (no en 2020) — 2 cortes en enero.
    expect(horas).toBe(10);
  });

  it('con ingreso a mitad de año, cuenta solo desde el ingreso', () => {
    const horas = calcularHorasAcumuladas('2026-06-20', null, '2026-07-31');
    // Cortes dentro de [20-jun, 31-jul]: 30-jun, 15-jul, 31-jul = 3.
    expect(horas).toBe(15);
  });

  it('con fecha de desactivación, no cuenta quincenas posteriores', () => {
    const horas = calcularHorasAcumuladas('2020-01-01', '2026-01-20', '2026-03-31');
    // Aunque "hoy" sea marzo, el devengo se congeló el 20-ene — solo el
    // corte del 15-ene entra (dentro de [1-ene, 20-ene]).
    expect(horas).toBe(5);
  });

  it('sin fecha de desactivación, sigue devengando hasta hoy', () => {
    const horas = calcularHorasAcumuladas('2026-01-01', undefined, '2026-01-15');
    expect(horas).toBe(5);
  });
});
