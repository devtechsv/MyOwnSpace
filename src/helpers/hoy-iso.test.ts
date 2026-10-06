import { hoyIso } from './hoy-iso';

describe('hoyIso', () => {
  it('usa la fecha local, no la de UTC', () => {
    // 7 p. m. del 6-oct en hora local: en UTC (El Salvador) ya es 7-oct.
    expect(hoyIso(new Date(2026, 9, 6, 19, 0))).toBe('2026-10-06');
  });

  it('rellena mes y día con cero', () => {
    expect(hoyIso(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
  });
});
