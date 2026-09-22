import apiClient from '@/services/api-client';
import { CreatePtoRequestPayload, PtoBalance } from '@/contracts/interfaces/pto';
import { LeaveRequest } from '@/contracts/interfaces/request';

export const httpPtoAdapter = {
  async getBalance(_employeeId: string): Promise<PtoBalance> {
    // Backend saca al empleado del JWT, nunca de un parámetro. Se
    // mantiene la firma para no tocar los llamados existentes.
    const { data } = await apiClient.get<PtoBalance>('/pto/balance');
    return data;
  },

  async create(_employeeId: string, payload: CreatePtoRequestPayload): Promise<LeaveRequest> {
    const { data } = await apiClient.post<LeaveRequest>('/pto/requests', payload);
    return data;
  },

  async listCalendario(): Promise<LeaveRequest[]> {
    const { data } = await apiClient.get<LeaveRequest[]>('/pto/calendario');
    return data;
  },
};
