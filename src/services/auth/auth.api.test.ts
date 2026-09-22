import { getCookie, deleteCookie } from 'cookies-next';
import authApi, { SESSION_COOKIE } from './auth.api';
import { resetMockState } from '@/services/mocks/mock-adapter';

beforeEach(() => {
  resetMockState();
  deleteCookie(SESSION_COOKIE);
});

describe('auth.api.login', () => {
  it('inicia sesión y guarda la sesión completa en la cookie de sesión', async () => {
    const session = await authApi.login({
      correo: 'ana.martinez@devtch.com',
      password: 'cualquiera',
    });

    expect(session.rol).toBe('Empleado');

    const cookieValue = getCookie(SESSION_COOKIE);
    expect(cookieValue).toBeTruthy();
    // La cookie guarda la sesión más un expiresAt propio (ver
    // session-cookie.ts) — no es un match exacto contra `session`.
    expect(JSON.parse(String(cookieValue))).toMatchObject(session);
    expect(JSON.parse(String(cookieValue)).expiresAt).toEqual(
      expect.any(Number),
    );
  });

  it('rechaza con credenciales inválidas y no deja cookie', async () => {
    await expect(
      authApi.login({ correo: 'no-existe@devtch.com', password: 'x' }),
    ).rejects.toThrow();

    expect(getCookie(SESSION_COOKIE)).toBeUndefined();
  });
});

describe('auth.api.logout', () => {
  it('borra la cookie de sesión', async () => {
    await authApi.login({
      correo: 'ana.martinez@devtch.com',
      password: 'cualquiera',
    });
    expect(getCookie(SESSION_COOKIE)).toBeTruthy();

    authApi.logout();

    expect(getCookie(SESSION_COOKIE)).toBeUndefined();
  });
});

describe('auth.api.forgotPassword', () => {
  it('forgotPassword resuelve sin lanzar, exista o no el correo', async () => {
    await expect(
      authApi.forgotPassword({ correo: 'ana.martinez@devtch.com' }),
    ).resolves.toBeUndefined();
    await expect(
      authApi.forgotPassword({ correo: 'no-existe@devtch.com' }),
    ).resolves.toBeUndefined();
  });
});
