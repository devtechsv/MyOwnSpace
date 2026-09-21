/**
 * @jest-environment node
 *
 * cookies-next decide si escribir la cookie por servidor o por cliente
 * mirando si `window` existe — en jsdom (el entorno por defecto de este
 * proyecto) siempre existe, así que nunca ejercitaría la rama de
 * servidor que renueva la cookie. Este archivo necesita el entorno
 * `node` para probar esa rama de verdad.
 */
import { IncomingMessage, ServerResponse } from 'http';
import refreshSession from './refresh-session';
import { encodeSession, SESSION_TTL_MS } from './session-cookie';

const req = {} as IncomingMessage;

function createRes() {
  const headers: Record<string, unknown> = {};
  return {
    getHeader: jest.fn((name: string) => headers[name]),
    setHeader: jest.fn((name: string, value: unknown) => {
      headers[name] = value;
    }),
  } as unknown as ServerResponse;
}

const sampleSession = {
  userId: 'u1',
  nombre: 'Julio Pérez',
  rol: 'Administrador' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
};

describe('refreshSession', () => {
  it('devuelve status "none" cuando no hay accessToken', async () => {
    const result = await refreshSession(undefined, undefined, req, createRes());
    expect(result).toEqual({ status: 'none' });
  });

  it('devuelve status "none" cuando accessToken no es un JSON válido', async () => {
    const result = await refreshSession('no-es-json', undefined, req, createRes());
    expect(result).toEqual({ status: 'none' });
  });

  it('devuelve status "valid" con la sesión cuando accessToken no venció, y renueva la cookie', async () => {
    const res = createRes();
    const raw = encodeSession(sampleSession);

    const result = await refreshSession(raw, undefined, req, res);

    expect(result).toEqual({ status: 'valid', session: sampleSession });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.anything(),
    );
  });

  it('devuelve status "expired" cuando expiresAt ya pasó', async () => {
    const expired = {
      ...sampleSession,
      expiresAt: Date.now() - 1000,
    };
    const raw = JSON.stringify(expired);

    const result = await refreshSession(raw, undefined, req, createRes());

    expect(result).toEqual({ status: 'expired' });
  });

  it('una sesión recién codificada sigue siendo válida bien dentro de las 2 horas', async () => {
    const almostExpired = {
      ...sampleSession,
      expiresAt: Date.now() + SESSION_TTL_MS - 1000,
    };
    const raw = JSON.stringify(almostExpired);

    const result = await refreshSession(raw, undefined, req, createRes());

    expect(result.status).toBe('valid');
  });
});
