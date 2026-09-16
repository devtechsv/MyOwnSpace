import { mockUsersAdapter } from '@/services/mocks/mock-adapter';
import { CreateUserPayload, UpdateUserPayload, User } from '@/contracts/interfaces/user';

async function list(): Promise<User[]> {
  return mockUsersAdapter.list();
}

async function create(payload: CreateUserPayload): Promise<User> {
  return mockUsersAdapter.create(payload);
}

async function update(id: string, payload: UpdateUserPayload): Promise<User> {
  return mockUsersAdapter.update(id, payload);
}

async function resetPassword(userId: string): Promise<void> {
  return mockUsersAdapter.resetPassword(userId);
}

async function toggleStatus(userId: string): Promise<User> {
  return mockUsersAdapter.toggleStatus(userId);
}

const users = {
  list,
  create,
  update,
  resetPassword,
  toggleStatus,
};

export default users;