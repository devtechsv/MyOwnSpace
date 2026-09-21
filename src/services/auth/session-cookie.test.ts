import {
  decodeSession,
  encodeSession,
  SESSION_TTL_MS,
} from './session-cookie';

const sampleSession = {
  userId: 'u3',
  nombre: 'Ana Martínez',
  rol: 'Empleado' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
};

describe('session-cookie', () => {
  it('encodeSession agrega un expiresAt ~2 horas en el futuro', () => {
    const before = Date.now();
    const raw = encodeSession(sampleSession);
    const stored = JSON.parse(raw);

    expect(stored.userId).toBe('u3');
    expect(stored.expiresAt).toBeGreaterThanOrEqual(before + SESSION_TTL_MS - 100);
    expect(stored.expiresAt).toBeLessThanOrEqual(before + SESSION_TTL_MS + 1000);
  });

  it('decodeSession recupera exactamente lo que encodeSession guardó', () => {
    const raw = encodeSession(sampleSession);
    const decoded = decodeSession(raw);

    expect(decoded).not.toBeNull();
    expect(decoded).toMatchObject(sampleSession);
    expect(typeof decoded?.expiresAt).toBe('number');
  });

  it('decodeSession devuelve null con un JSON inválido', () => {
    expect(decodeSession('no-es-json')).toBeNull();
  });

  it('decodeSession devuelve null si falta expiresAt (formato viejo o corrupto)', () => {
    expect(decodeSession(JSON.stringify(sampleSession))).toBeNull();
  });
});
