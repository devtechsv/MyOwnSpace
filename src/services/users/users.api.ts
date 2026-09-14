import { mockUsersAdapter } from '@/services/mocks/mock-adapter';
import { CreateUserPayload, User } from '@/contracts/interfaces/user';

async function list(): Promise<User[]> {
  return mockUsersAdapter.list();
}

async function create(payload: CreateUserPayload): Promise<User> {
  return mockUsersAdapter.create(payload);
}

// update/toggleStatus se agregan en la Tarea 19/20.
async function resetPassword(userId: string): Promise<void> {
  return mockUsersAdapter.resetPassword(userId);
}

const users = {
  list,
  create,
  resetPassword,
};

export default users;
