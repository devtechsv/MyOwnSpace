import usersApi from './users.api';
import { mockUsersAdapter, resetMockState } from '@/services/mocks/mock-adapter';

beforeEach(() => {
  resetMockState();
});

describe('users.api.list', () => {
  it('delega al mock y devuelve todos los usuarios', async () => {
    const usuarios = await usersApi.list(1, 20);
    const fixtures = await mockUsersAdapter.list(1, 20);

    expect(usuarios).toEqual(fixtures);
  });
});

describe('users.api.create', () => {
  it('delega al mock y crea el usuario en estado Pendiente', async () => {
    const nuevo = await usersApi.create({
      nombre: 'Nuevo Empleado',
      correo: 'nuevo.empleado@devtch.com',
      rol: 'Empleado',
      fechaIngreso: '2026-01-01',
    });

    expect(nuevo.estado).toBe('Pendiente');
  });

  it('rechaza si el correo ya existe', async () => {
    await expect(
      usersApi.create({
        nombre: 'Otro',
        correo: 'julio.perez@devtch.com',
        rol: 'Empleado',
        fechaIngreso: '2026-01-01',
      }),
    ).rejects.toThrow('Ya existe un usuario con ese correo.');
  });
});

describe('users.api.resetPassword', () => {
  it('emite una temporal: queda Activo y con mustChangePassword', async () => {
    await usersApi.resetPassword('u1'); // Julio Pérez, Activo en los fixtures

    const usuarios = await mockUsersAdapter.list(1, 20);
    const julio = usuarios.items.find((u) => u.id === 'u1');
    expect(julio?.estado).toBe('Activo');
    expect(julio?.mustChangePassword).toBe(true);
  });

  it('rechaza si el id de usuario no existe', async () => {
    await expect(usersApi.resetPassword('no-existe')).rejects.toThrow();
  });
});
