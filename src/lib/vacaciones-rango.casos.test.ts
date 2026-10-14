// Mismos casos que corre el backend (PtoCalculadoraCasosCompartidosTests.cs,
// ValidarRango): si una validación del rango cambia en un solo lado, una de
// las dos suites falla.
import casos from '../../test-data/pto-calculadora-casos.json';
import { validarRangoVacaciones } from './vacaciones-rango';

describe('validación del rango de vacaciones — casos compartidos con el backend', () => {
  it.each(casos.validacionRango.map((c) => [c.nombre, c] as const))('%s', (_nombre, caso) => {
    expect(validarRangoVacaciones(caso.hoy, caso.fechaInicio, caso.fechaFin)).toBe(caso.error);
  });

  it('sin fecha de fin solo revisa el inicio', () => {
    expect(validarRangoVacaciones('2026-10-05', '2026-10-12')).toBeNull();
    expect(validarRangoVacaciones('2026-10-05', '2026-10-10')).toBe(
      'Las vacaciones no pueden iniciar en sábado ni domingo.',
    );
  });
});
