import { errorMessage } from './error-message';
import { errorDelApi } from '@/test-utils/api-error';

describe('errorMessage', () => {
  it('con un error del API, devuelve el detail en vez de "Request failed…"', () => {
    expect(errorMessage(errorDelApi(409, 'Ya existe un usuario con ese correo.'), 'fallback')).toBe(
      'Ya existe un usuario con ese correo.',
    );
  });

  it('con un error del API sin detail, devuelve el fallback', () => {
    expect(errorMessage(errorDelApi(500), 'No pudimos crear el usuario.')).toBe(
      'No pudimos crear el usuario.',
    );
  });

  it('con un Error común (mock), devuelve su message', () => {
    expect(errorMessage(new Error('Texto del mock'), 'fallback')).toBe('Texto del mock');
  });
});
