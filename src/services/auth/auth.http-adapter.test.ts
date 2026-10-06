import { ServerResponse } from 'http';
import apiClient from '@/services/api-client';
import { httpAuthAdapter } from './auth.http-adapter';
import { errorDeRed, errorDelApi } from '@/test-utils/api-error';

jest.mock('@/services/api-client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;
const res = { setHeader: jest.fn() } as unknown as ServerResponse;

beforeEach(() => getMock.mockReset());

describe('httpAuthAdapter.refreshSession', () => {
  it('un 401 del servidor es sesión vencida', async () => {
    getMock.mockRejectedValue(errorDelApi(401));
    await expect(httpAuthAdapter.refreshSession('token', res)).resolves.toEqual({ status: 'expired' });
  });

  it('con la API caída no dice que la sesión expiró', async () => {
    // Regresión: antes cualquier error era "expired" y el usuario veía
    // "tu sesión expiró por inactividad" con el backend apagado.
    getMock.mockRejectedValue(errorDeRed());
    await expect(httpAuthAdapter.refreshSession('token', res)).resolves.toEqual({ status: 'unavailable' });
  });

  it('un 5xx de la API tampoco es sesión vencida', async () => {
    getMock.mockRejectedValue(errorDelApi(503));
    await expect(httpAuthAdapter.refreshSession('token', res)).resolves.toEqual({ status: 'unavailable' });
  });
});
