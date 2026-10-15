import { GetServerSidePropsContext } from 'next';
import API from '@/services/api-services';
import { getServerSideProps } from '@/pages/admin/audit';

jest.mock('@/services/api-services', () => ({
  __esModule: true,
  default: { auth: { refreshSession: jest.fn() } },
}));

const refreshSessionMock = API.auth.refreshSession as jest.Mock;

function contexto(): GetServerSidePropsContext {
  return {
    req: { cookies: { accessToken: 'token' } },
    res: {},
    resolvedUrl: '/admin/audit',
  } as unknown as GetServerSidePropsContext;
}

const empleado = { userId: 'u3', nombre: 'Ana Martínez', rol: 'Empleado', estado: 'Activo', mustChangePassword: false };
const admin = { ...empleado, userId: 'u1', nombre: 'Julio Pérez', rol: 'Administrador' };

beforeEach(() => refreshSessionMock.mockReset());

// La bitácora es solo para administradores: un empleado recibe el 404
// genérico (nunca "sin permiso") y sin sesión se va al login.
describe('/admin/audit — acceso', () => {
  it('sin sesión, redirige a /login', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'none' });

    expect(await getServerSideProps(contexto())).toEqual({
      redirect: { destination: '/login', permanent: false },
    });
  });

  it('un empleado recibe 404', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'valid', session: empleado });

    expect(await getServerSideProps(contexto())).toEqual({ notFound: true });
  });

  it('un administrador entra', async () => {
    refreshSessionMock.mockResolvedValue({ status: 'valid', session: admin });

    expect(await getServerSideProps(contexto())).toEqual({ props: { session: admin } });
  });
});
