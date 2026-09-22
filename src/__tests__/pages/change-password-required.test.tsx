import { GetServerSidePropsContext } from 'next';
import { getServerSideProps } from '@/pages/change-password-required';
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
    resolvedUrl: '/change-password-required',
  } as unknown as GetServerSidePropsContext;
}

beforeEach(() => {
  refreshSessionMock.mockReset();
});

describe('change-password-required getServerSideProps', () => {
  it('con mustChangePassword true, renderiza la página (props vacío)', async () => {
    refreshSessionMock.mockResolvedValue({
      status: 'valid',
      session: {
        userId: 'u3',
        nombre: 'Ana Martínez',
        rol: 'Empleado',
        estado: 'Activo',
        mustChangePassword: true,
      },
    });

    const result = await getServerSideProps(createContext());

    expect(result).toHaveProperty('props');
  });

  it('con mustChangePassword false, redirige al home según el rol (evita mostrarla sin necesidad)', async () => {
    refreshSessionMock.mockResolvedValue({
      status: 'valid',
      session: {
        userId: 'u1',
        nombre: 'Julio Pérez',
        rol: 'Administrador',
        estado: 'Activo',
        mustChangePassword: false,
      },
    });

    const result = await getServerSideProps(createContext());

    expect(result).toEqual({
      redirect: { destination: '/admin/requests', permanent: false },
    });
  });
});
