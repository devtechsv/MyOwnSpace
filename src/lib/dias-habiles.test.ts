import { contarDiasHabiles, esDiaHabil, sumarAnios, sumarDias } from './dias-habiles';

describe('días hábiles', () => {
  it('solo cuenta de lunes a viernes', () => {
    expect(contarDiasHabiles('2026-10-05', '2026-10-11')).toBe(5);
  });

  it('un rango invertido no tiene días hábiles', () => {
    expect(contarDiasHabiles('2026-10-09', '2026-10-05')).toBe(0);
  });

  it('sábado y domingo no son hábiles', () => {
    expect(esDiaHabil('2026-10-10')).toBe(false);
    expect(esDiaHabil('2026-10-11')).toBe(false);
    expect(esDiaHabil('2026-10-12')).toBe(true);
  });

  it('sumarDias cruza meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('sumarAnios lleva un 29-feb al 28-feb si el año destino no es bisiesto', () => {
    expect(sumarAnios('2026-10-12', 1)).toBe('2027-10-12');
    expect(sumarAnios('2028-02-29', 1)).toBe('2029-02-28');
    expect(sumarAnios('2028-02-29', 4)).toBe('2032-02-29');
  });
});
