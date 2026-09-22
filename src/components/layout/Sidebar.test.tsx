import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { SessionContext } from '@/hooks/useSession';
import { Session } from '@/contracts/interfaces/auth';
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
  mustChangePassword: false,
};

const adminSession = {
  userId: 'u1',
  nombre: 'Julio Pérez',
  rol: 'Administrador' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
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
  useRouterMock.mockReturnValue({ push: pushMock, pathname: '/' });
});

describe('Sidebar', () => {
  it('no renderiza nada sin sesión', () => {
    const { container } = renderSidebar(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('Empleado ve "Mis solicitudes"/"Mi PTO", no navegación de admin', () => {
    renderSidebar(empleadoSession);

    expect(screen.getByRole('link', { name: /mis solicitudes/i })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getByRole('link', { name: /mi pto/i })).toHaveAttribute(
      'href',
      '/pto',
    );
    expect(screen.queryByText('Solicitudes')).not.toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).not.toBeInTheDocument();
  });

  it('Administrador ve "Solicitudes"/"Usuarios", no navegación de empleado', () => {
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
      screen.queryByRole('link', { name: /mi pto/i }),
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
});
