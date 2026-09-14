import usersApi from './users.api';
import { mockUsersAdapter, resetMockState } from '@/services/mocks/mock-adapter';

beforeEach(() => {
  resetMockState();
});

describe('users.api.resetPassword', () => {
  it('deja al usuario en estado Pendiente', async () => {
    await usersApi.resetPassword('u1'); // Julio Pérez, Activo en los fixtures

    const usuarios = await mockUsersAdapter.list();
    const julio = usuarios.find((u) => u.id === 'u1');
    expect(julio?.estado).toBe('Pendiente');
  });

  it('rechaza si el id de usuario no existe', async () => {
    await expect(usersApi.resetPassword('no-existe')).rejects.toThrow();
  });
});
