import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { deleteCookie, getCookie } from 'cookies-next';
import { Topbar } from './Topbar';
import { SessionContext } from '@/hooks/useSession';
import { SESSION_COOKIE } from '@/services/auth/auth.api';
import authApi from '@/services/auth/auth.api';
import { resetMockState } from '@/services/mocks/mock-adapter';

const pushMock = jest.fn();

jest.mock('next/router', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const session = {
  userId: 'u3',
  nombre: 'Ana Martínez',
  rol: 'Empleado' as const,
  estado: 'Activo' as const,
  mustChangePassword: false,
};

function renderTopbar() {
  return render(
    <SessionContext.Provider value={session}>
      <Topbar />
    </SessionContext.Provider>,
  );
}

beforeEach(() => {
  resetMockState();
  pushMock.mockClear();
  deleteCookie(SESSION_COOKIE);
});

describe('Topbar', () => {
  it('muestra el nombre, el rol y las iniciales del usuario', () => {
    renderTopbar();

    expect(screen.getByText('Ana Martínez')).toBeInTheDocument();
    expect(screen.getByText('Empleado')).toBeInTheDocument();
    expect(screen.getByText('AM')).toBeInTheDocument();
  });

  it('incluye el toggle de tema', () => {
    renderTopbar();
    expect(
      screen.getByRole('button', { name: /cambiar a modo/i }),
    ).toBeInTheDocument();
  });

  it('el menú de perfil está cerrado por defecto y se abre al hacer click', () => {
    renderTopbar();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ana martínez/i }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Cambiar contraseña' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Cerrar sesión' }),
    ).toBeInTheDocument();
  });

  it('"Cambiar contraseña" abre el modal de autoservicio', () => {
    renderTopbar();

    fireEvent.click(screen.getByRole('button', { name: /ana martínez/i }));
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Cambiar contraseña' }),
    );

    expect(
      screen.getByText('Cambiar tu contraseña'),
    ).toBeInTheDocument();
  });

  it('"Cerrar sesión" borra la cookie de sesión y redirige a /login', async () => {
    await authApi.login({
      correo: 'ana.martinez@devtch.com',
      password: 'cualquiera',
    });
    expect(getCookie(SESSION_COOKIE)).toBeTruthy();

    renderTopbar();

    fireEvent.click(screen.getByRole('button', { name: /ana martínez/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(getCookie(SESSION_COOKIE)).toBeUndefined();
  });
});
