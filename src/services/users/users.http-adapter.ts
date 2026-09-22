import apiClient from '@/services/api-client';
import { CreateUserPayload, UpdateUserPayload, User, UserStats } from '@/contracts/interfaces/user';
import { PagedResult } from '@/contracts/interfaces/common';

export const httpUsersAdapter = {
  async list(page: number, pageSize: number): Promise<PagedResult<User>> {
    const { data } = await apiClient.get<PagedResult<User>>('/users', { params: { page, pageSize } });
    return data;
  },

  async stats(): Promise<UserStats> {
    const { data } = await apiClient.get<UserStats>('/users/stats');
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