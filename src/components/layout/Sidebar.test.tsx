import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { deleteCookie, getCookie } from 'cookies-next';
import { Sidebar } from './Sidebar';
import { SessionContext } from '@/hooks/useSession';
import { Session } from '@/contracts/interfaces/auth';
import { SESSION_COOKIE } from '@/services/auth/auth.api';
import authApi from '@/services/auth/auth.api';
import { resetMockState } from '@/services/mocks/mock-adapter';

const pushMock = jest.fn();
const useRouterMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => useRouterMock(),
}));

const empleadoSession = {
  userId: 'u3',
  nombre: 'Ana Martínez',
  rol: 'Empleado' as const,
  estado: 'Activo' as const,
};

const adminSession = {
  userId: 'u1',
  nombre: 'Julio Pérez',
  rol: 'Administrador' as const,
  estado: 'Activo' as const,
};

function renderSidebar(session: Session | null, props = {}) {
  return render(
    <SessionContext.Provider value={session}>
      <Sidebar {...props} />
    </SessionContext.Provider>,
  );
}

beforeEach(() => {
  resetMockState();
  pushMock.mockClear();
  deleteCookie(SESSION_COOKIE);
  useRouterMock.mockReturnValue({ push: pushMock, pathname: '/' });
});

describe('Sidebar', () => {
  it('no renderiza nada sin sesión', () => {
    const { container } = renderSidebar(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('Empleado ve "Crear solicitud" y "Cerrar sesión", no navegación de admin', () => {
    renderSidebar(empleadoSession);

    expect(
      screen.getByRole('button', { name: /crear solicitud/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Solicitudes')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('Administrador ve "Solicitudes"/"Usuarios" y "Cerrar sesión", no "Crear solicitud"', () => {
    renderSidebar(adminSession);

    expect(screen.getByRole('link', { name: /solicitudes/i })).toHaveAttribute(
      'href',
      '/admin/requests',
    );
    expect(screen.getByRole('link', { name: /usuarios/i })).toHaveAttribute(
      'href',
      '/admin/users',
    );
    expect(
      screen.getByRole('button', { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /crear solicitud/i }),
    ).not.toBeInTheDocument();
  });

  it('resalta el ítem de navegación que coincide con la ruta actual', () => {
    useRouterMock.mockReturnValue({ push: pushMock, pathname: '/admin/requests' });
    renderSidebar(adminSession);

    expect(screen.getByRole('link', { name: /solicitudes/i })).toHaveClass(
      'text-turquoise-blue-600',
    );
    expect(screen.getByRole('link', { name: /usuarios/i })).not.toHaveClass(
      'text-turquoise-blue-600',
    );
  });

  it('"Crear solicitud" llama a onCreateRequest', () => {
    const onCreateRequest = jest.fn();
    renderSidebar(empleadoSession, { onCreateRequest });

    fireEvent.click(screen.getByRole('button', { name: /crear solicitud/i }));

    expect(onCreateRequest).toHaveBeenCalledTimes(1);
  });

  it('"Cerrar sesión" borra la cookie de sesión y redirige a /login', async () => {
    await authApi.login({
      correo: 'ana.martinez@devtch.com',
      password: 'cualquiera',
    });
    expect(getCookie(SESSION_COOKIE)).toBeTruthy();

    renderSidebar(empleadoSession);

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(getCookie(SESSION_COOKIE)).toBeUndefined();
  });
});
