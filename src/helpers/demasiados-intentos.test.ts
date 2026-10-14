import { esDemasiadosIntentos } from './demasiados-intentos';
import { errorDeRed, errorDelApi } from '@/test-utils/api-error';

describe('esDemasiadosIntentos', () => {
  it('un 429 es demasiados intentos', () => {
    expect(esDemasiadosIntentos(errorDelApi(429))).toBe(true);
  });

  it('otros errores del API o de red no lo son', () => {
    expect(esDemasiadosIntentos(errorDelApi(401))).toBe(false);
    expect(esDemasiadosIntentos(errorDelApi(500))).toBe(false);
    expect(esDemasiadosIntentos(errorDeRed())).toBe(false);
  });

  it('un Error que no es de axios (el mock) no cuenta', () => {
    expect(esDemasiadosIntentos(new Error('Credenciales inválidas'))).toBe(false);
  });
});
