import { esServidorNoDisponible } from './servidor-no-disponible';
import { errorDeRed, errorDelApi } from '@/test-utils/api-error';

describe('esServidorNoDisponible', () => {
  it('sin respuesta (API caída o sin red) es servidor no disponible', () => {
    expect(esServidorNoDisponible(errorDeRed())).toBe(true);
  });

  it('un 5xx es servidor no disponible', () => {
    expect(esServidorNoDisponible(errorDelApi(500))).toBe(true);
    expect(esServidorNoDisponible(errorDelApi(503))).toBe(true);
  });

  it('un 4xx es una respuesta real del servidor', () => {
    expect(esServidorNoDisponible(errorDelApi(401))).toBe(false);
    expect(esServidorNoDisponible(errorDelApi(429))).toBe(false);
  });

  it('un Error que no es de axios (el mock) no cuenta', () => {
    expect(esServidorNoDisponible(new Error('Credenciales inválidas'))).toBe(false);
  });
});
