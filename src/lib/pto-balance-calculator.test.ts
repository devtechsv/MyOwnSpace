import {
  calcularHorasDisponibles,
  calcularHorasEnAcumulacion,
  contarQuincenasCompletadas,
  inicioPeriodo,
} from './pto-balance-calculator';

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

describe('periodos por aniversario', () => {
  it.each([
    ['2026-03-09', '2025-03-10'],
    ['2026-03-10', '2026-03-10'],
    ['2024-05-01', '2024-03-10'],
  ])('inicioPeriodo(%s) es el último aniversario: %s', (fecha, esperado) => {
    expect(inicioPeriodo('2024-03-10', fecha)).toBe(esperado);
  });

  it('un ingreso del 29 de febrero cae en 28 de febrero en años no bisiestos', () => {
    expect(inicioPeriodo('2024-02-29', '2025-03-01')).toBe('2025-02-28');
  });
});

describe('calcularHorasDisponibles / calcularHorasEnAcumulacion', () => {
  it('durante el primer año no hay nada disponible, pero sí en acumulación', () => {
    expect(calcularHorasDisponibles('2026-03-10', null, '2026-07-31', '2026-07-31')).toBe(0);
    expect(calcularHorasEnAcumulacion('2026-03-10', null, '2026-07-31')).toBe(50);
  });

  it('al cumplir el año libera las 120h del periodo anterior y reinicia la acumulación', () => {
    expect(calcularHorasDisponibles('2025-03-10', null, '2026-03-10', '2026-03-10')).toBe(120);
    expect(calcularHorasEnAcumulacion('2025-03-10', null, '2026-03-10')).toBe(0);
  });

  it('para una fecha del periodo siguiente solo cuenta lo ganado hasta hoy', () => {
    expect(calcularHorasDisponibles('2025-03-10', null, '2027-03-15', '2026-07-31')).toBe(50);
  });

  it('con fecha de desactivación, no cuenta quincenas posteriores', () => {
    expect(calcularHorasDisponibles('2025-01-01', '2025-01-20', '2026-02-01', '2026-02-01')).toBe(5);
  });
});
