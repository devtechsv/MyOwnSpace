import { mockUsersAdapter } from '@/services/mocks/mock-adapter';
import { User } from '@/contracts/interfaces/user';

async function list(): Promise<User[]> {
  return mockUsersAdapter.list();
}

// create/update/toggleStatus se agregan en la Tarea 17+ (pantalla de
// Usuarios del admin).
async function resetPassword(userId: string): Promise<void> {
  return mockUsersAdapter.resetPassword(userId);
}

const users = {
  list,
  resetPassword,
};

export default users;
