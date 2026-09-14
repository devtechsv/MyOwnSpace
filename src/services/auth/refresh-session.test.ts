import { IncomingMessage, ServerResponse } from 'http';
import refreshSession from './refresh-session';

const req = {} as IncomingMessage;
const res = {} as ServerResponse;

describe('refreshSession', () => {
  it('devuelve la sesión cuando accessToken contiene un JSON válido', async () => {
    const session = {
      userId: 'u1',
      nombre: 'Julio Pérez',
      rol: 'Administrador',
      estado: 'Activo',
    };

    const result = await refreshSession(
      JSON.stringify(session),
      undefined,
      req,
      res,
    );

    expect(result).toEqual(session);
  });

  it('devuelve null cuando no hay accessToken', async () => {
    const result = await refreshSession(undefined, undefined, req, res);
    expect(result).toBeNull();
  });

  it('devuelve null cuando accessToken no es un JSON válido', async () => {
    const result = await refreshSession('no-es-json', undefined, req, res);
    expect(result).toBeNull();
  });
});
