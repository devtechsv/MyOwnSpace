import { GetServerSidePropsContext } from 'next';
import { withAuth } from './with-auth';
import API from '@/services/api-services';

jest.mock('@/services/api-services', () => ({
  __esModule: true,
  default: { auth: { refreshSession: jest.fn() } },
}));

const refreshSessionMock = API.auth.refreshSession as jest.Mock;

function createContext(): GetServerSidePropsContext {
  return {
    req: { cookies: { accessToken: 'token', refreshToken: undefined } },
    res: {},
  } as unknown as GetServerSidePropsContext;
}

const empleadoSession = {
  userId: 'u3',
  nombre: 'Ana Martínez',
  rol: 'Empleado',
  estado: 'Activo',
};

const adminSession = { ...empleadoSession, userId: 'u1', rol: 'Administrador' };

beforeEach(() => {
  refreshSessionMock.mockReset();
});

describe('withAuth (rutas protegidas)', () => {
  it('sin sesión válida, redirige a /login', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'none' });
    const fn = jest.fn();

    const result = await withAuth(fn)(createContext());

    expect(result).toEqual({
      redirect: { destination: '/login', permanent: false },
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('con sesión vencida por inactividad, redirige a /login?expired=1', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'expired' });
    const fn = jest.fn();

    const result = await withAuth(fn)(createContext());

    expect(result).toEqual({
      redirect: { destination: '/login?expired=1', permanent: false },
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('con sesión válida, llama a fn con el usuario', async () => {
    refreshSessionMock.mockResolvedValue({
      status: 'valid',
      session: empleadoSession,
    });
    const fn = jest.fn().mockResolvedValue({ props: {} });

    await withAuth(fn)(createContext());

    expect(fn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user: empleadoSession }),
    );
  });

  it('con roles restringidos y el rol no coincide, devuelve notFound (404)', async () => {
    refreshSessionMock.mockResolvedValue({
      status: 'valid',
      session: empleadoSession,
    });
    const fn = jest.fn();

    const result = await withAuth(fn, { roles: ['Administrador'] })(
      createContext(),
    );

    expect(result).toEqual({ notFound: true });
    expect(fn).not.toHaveBeenCalled();
  });

  it('con roles restringidos y el rol coincide, llama a fn', async () => {
    refreshSessionMock.mockResolvedValue({
      status: 'valid',
      session: adminSession,
    });
    const fn = jest.fn().mockResolvedValue({ props: {} });

    await withAuth(fn, { roles: ['Administrador'] })(createContext());

    expect(fn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user: adminSession }),
    );
  });
});

describe('withAuth({ public: true })', () => {
  it('sin sesión, llama a fn con user: null (no redirige)', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'none' });
    const fn = jest.fn().mockResolvedValue({ props: {} });

    await withAuth(fn, { public: true })(createContext());

    expect(fn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user: null }),
    );
  });

  it('con sesión vencida, también llama a fn con user: null (no redirige)', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'expired' });
    const fn = jest.fn().mockResolvedValue({ props: {} });

    await withAuth(fn, { public: true })(createContext());

    expect(fn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user: null }),
    );
  });

  it('con sesión válida, llama a fn con el usuario', async () => {
    refreshSessionMock.mockResolvedValue({
      status: 'valid',
      session: empleadoSession,
    });
    const fn = jest.fn().mockResolvedValue({ props: {} });

    await withAuth(fn, { public: true })(createContext());

    expect(fn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ user: empleadoSession }),
    );
  });
});
