import {
  Ausencia,
  calcularEstadoPto,
  contarQuincenasCompletadas,
  diasTrabajados,
  inicioPeriodo,
  TramoReclamado,
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

// Mismos casos que PtoBalanceCalculatorTests.cs (ejemplo de MEJORAS.md:
// ingreso el 10-may-2026).
const INGRESO = '2026-05-10';

function estado(hoy: string, reclamos: TramoReclamado[] = [], ausencias: Ausencia[] = [], ingreso = INGRESO) {
  return calcularEstadoPto(ingreso, null, hoy, reclamos, ausencias);
}

describe('calcularEstadoPto', () => {
  it('acumula 5h por quincena desde el ingreso', () => {
    expect(estado('2026-12-31').horasAcumuladas).toBe(80);
  });

  it('lo acumulado sin reclamar se borra el 1 de enero', () => {
    expect(estado('2027-01-10').horasAcumuladas).toBe(0);
    expect(estado('2027-01-15').horasAcumuladas).toBe(5);
  });

  it('lo ya reclamado no se vuelve a contar como acumulado', () => {
    expect(estado('2026-12-31', [{ corteDesde: INGRESO, corteHasta: '2026-12-31' }]).horasAcumuladas).toBe(0);
  });

  it('lo reclamado en el primer año queda bloqueado hasta el aniversario', () => {
    const e = estado('2027-03-01', [{ corteDesde: INGRESO, corteHasta: '2026-12-31' }]);

    expect(e.horasReclamadasHabilitadas).toBe(0);
    expect(e.horasReclamadasBloqueadas).toBe(80);
    expect(e.fechaProximaHabilitacion).toBe('2027-05-10');
  });

  it('al cumplir el año, lo reclamado se habilita', () => {
    const e = estado('2027-05-10', [
      { corteDesde: INGRESO, corteHasta: '2026-12-31' },
      { corteDesde: '2027-01-01', corteHasta: '2027-05-09' },
    ]);

    expect(e.horasReclamadasHabilitadas).toBe(120);
    expect(e.horasReclamadasBloqueadas).toBe(0);
  });

  it('cada hora pertenece al año laboral en que se ganó', () => {
    const e = estado('2027-05-20', [{ corteDesde: '2027-01-01', corteHasta: '2027-05-20' }]);

    expect(e.horasReclamadasHabilitadas).toBe(40);
    expect(e.horasReclamadasBloqueadas).toBe(5);
    expect(e.fechaProximaHabilitacion).toBe('2028-05-10');
  });

  it('con menos de 200 días trabajados, sigue bloqueado hasta un año que cumpla', () => {
    const ausencias = [{ desde: '2025-01-01', hasta: '2025-04-30' }];
    const reclamos = [
      { corteDesde: '2025-01-01', corteHasta: '2025-12-31' },
      { corteDesde: '2026-01-01', corteHasta: '2026-12-31' },
    ];

    const alPrimero = estado('2026-01-05', reclamos.slice(0, 1), ausencias, '2025-01-01');
    expect(alPrimero.horasReclamadasHabilitadas).toBe(0);
    expect(alPrimero.horasReclamadasBloqueadas).toBe(120);

    const alSegundo = estado('2027-01-05', reclamos, ausencias, '2025-01-01');
    expect(alSegundo.horasReclamadasHabilitadas).toBe(240);
  });

  it('informa los días trabajados del año laboral en curso', () => {
    expect(estado('2026-05-15').diasTrabajadosAnioLaboral).toBe(5);
  });
});

describe('días trabajados y año laboral', () => {
  it('no descuenta fines de semana ni duplica ausencias superpuestas', () => {
    const ausencias = [
      { desde: '2026-10-09', hasta: '2026-10-12' },
      { desde: '2026-10-12', hasta: '2026-10-12' },
    ];
    expect(diasTrabajados('2026-10-05', '2026-10-16', ausencias)).toBe(8);
  });

  it('un ingreso del 29 de febrero cae en 28 de febrero en años no bisiestos', () => {
    expect(inicioPeriodo('2024-02-29', '2025-03-01')).toBe('2025-02-28');
  });
});
