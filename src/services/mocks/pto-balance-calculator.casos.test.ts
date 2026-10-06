// Mismos casos que corre el backend (PtoCalculadoraCasosCompartidosTests.cs):
// si una regla de PTO cambia en un solo lado, una de las dos suites falla.
import casos from '../../../test-data/pto-calculadora-casos.json';
import { contarDiasHabiles } from '@/lib/dias-habiles';
import { calcularEstadoPto, tramoPendiente } from './pto-balance-calculator';

describe('calculadora de PTO del modo simulado — casos compartidos con el backend', () => {
  it.each(casos.estado.map((c) => [c.nombre, c] as const))('%s', (_nombre, caso) => {
    const reclamos = caso.reclamos.map((r) => ({ corteDesde: r.desde, corteHasta: r.hasta }));
    const ultimoCorte = reclamos.reduce<string | null>(
      (acc, r) => (acc === null || r.corteHasta > acc ? r.corteHasta : acc),
      null,
    );

    const estado = calcularEstadoPto(caso.fechaIngreso, caso.fechaDesactivacion, caso.hoy, reclamos, caso.ausencias);
    const tramo = tramoPendiente(caso.fechaIngreso, caso.fechaDesactivacion, caso.hoy, ultimoCorte);

    const { tramoPendiente: tramoEsperado, ...estadoEsperado } = caso.esperado;
    expect(estado).toEqual(estadoEsperado);
    expect(tramo ? { desde: tramo.corteDesde, hasta: tramo.corteHasta } : null).toEqual(tramoEsperado);
  });

  it.each(casos.diasHabiles.map((c) => [c.nombre, c] as const))('días hábiles: %s', (_nombre, caso) => {
    expect(contarDiasHabiles(caso.desde, caso.hasta)).toBe(caso.esperado);
  });
});
