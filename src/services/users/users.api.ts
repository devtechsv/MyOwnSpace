import { mockUsersAdapter } from '@/services/mocks/mock-adapter';
import { httpUsersAdapter } from './users.http-adapter';
import { CreateUserPayload, UpdateUserPayload, User, UserStats } from '@/contracts/interfaces/user';
import { PagedResult } from '@/contracts/interfaces/common';
import { USE_REAL_API } from '@/services/use-real-api';

// Coexistencia mock/real (ver SPEC.md del backend, "Migración del
// frontend"): mientras no se reemplaza el mock por completo, se elige
// acá según esta variable — el resto de la app nunca sabe cuál de los
// dos está respondiendo. Prender NEXT_PUBLIC_USE_REAL_API=true en
// .env.local para probar contra OwnSpaceAPI real corriendo en local.
const adapter = USE_REAL_API ? httpUsersAdapter : mockUsersAdapter;

async function list(page: number, pageSize: number): Promise<PagedResult<User>> {
  return adapter.list(page, pageSize);
}

async function stats(): Promise<UserStats> {
  return adapter.stats();
}

async function create(payload: CreateUserPayload): Promise<User> {
  return adapter.create(payload);
}

async function update(id: string, payload: UpdateUserPayload): Promise<User> {
  return adapter.update(id, payload);
}

async function resetPassword(userId: string): Promise<void> {
  return adapter.resetPassword(userId);
}

async function toggleStatus(userId: string): Promise<User> {
  return adapter.toggleStatus(userId);
}

const users = {
  list,
  stats,
  create,
  update,
  resetPassword,
  toggleStatus,
};

export default users;