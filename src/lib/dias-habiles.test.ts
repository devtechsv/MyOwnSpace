import { contarDiasHabiles, esDiaHabil, sumarDias } from './dias-habiles';

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
});
