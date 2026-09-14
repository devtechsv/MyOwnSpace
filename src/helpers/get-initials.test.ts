import { getInitials } from './get-initials';

describe('getInitials', () => {
  it('toma la primera letra de las primeras dos palabras', () => {
    expect(getInitials('Ana Martínez')).toBe('AM');
  });

  it('funciona con un solo nombre', () => {
    expect(getInitials('Ana')).toBe('A');
  });

  it('ignora espacios extra', () => {
    expect(getInitials('  Ana   Martínez  ')).toBe('AM');
  });

  it('usa solo las dos primeras palabras si hay más', () => {
    expect(getInitials('Ana María Martínez Gómez')).toBe('AM');
  });

  it('devuelve vacío para un string vacío', () => {
    expect(getInitials('')).toBe('');
  });
});
