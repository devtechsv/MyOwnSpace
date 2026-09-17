import apiClient from '@/services/api-client';
import { CreateUserPayload, UpdateUserPayload, User } from '@/contracts/interfaces/user';

export const httpUsersAdapter = {
  async list(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>('/users');
    return data;
  },

  async create(payload: CreateUserPayload): Promise<User> {
    const { data } = await apiClient.post<User>('/users', payload);
    return data;
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const { data } = await apiClient.patch<User>(`/users/${id}`, payload);
    return data;
  },

  async resetPassword(userId: string): Promise<void> {
    await apiClient.post(`/users/${userId}/reset-password`);
  },

  async toggleStatus(userId: string): Promise<User> {
    const { data } = await apiClient.post<User>(`/users/${userId}/toggle-status`);
    return data;
  },
};