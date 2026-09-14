import { mockUsersAdapter } from '@/services/mocks/mock-adapter';

// Por ahora solo resetPassword (lo necesita el Topbar para "Cambiar
// contraseña"). list/create/update/toggleStatus se agregan en la Fase 3
// (Tareas 17-20), cuando exista la pantalla de Usuarios del admin.

async function resetPassword(userId: string): Promise<void>{
  return mockUsersAdapter.resetPassword(userId);
}

const users = {
  resetPassword,
};

export default users;