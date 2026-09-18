import apiClient from '@/services/api-client';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
  RequestStatus,
} from '@/contracts/interfaces/request';

export const httpRequestsAdapter = {
  async listByEmployee(_employeeId: string): Promise<LeaveRequest[]> {
    // Backend permite sacar al empleado del JWT, nunca un parámetro.
    // Se mantiene la firma para no tocar los llamados existentes.
    const { data } = await apiClient.get<LeaveRequest[]>('/requests/mine');
    return data;
  },

  async listPending(): Promise<LeaveRequest[]> {
    const { data } = await apiClient.get<LeaveRequest[]>('/requests/pending');
    return data;
  },

  async listAll(estado?: RequestStatus): Promise<LeaveRequest[]> {
    const { data } = await apiClient.get<LeaveRequest[]>('/requests', {
      params: estado ? { estado } : undefined,
    });
    return data;
  },

  async create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
    const { employeeId: _employeeId, ...body } = payload;
    const { data } = await apiClient.post<LeaveRequest>('/requests', body);
    return data;
  },

  async approve(id: string, _reviewerId: string): Promise<LeaveRequest> {
    const { data } = await apiClient.post<LeaveRequest>(
      `/requests/${id}/approve`,
    );
    return data;
  },

  async deny(id: string, _reviewerId: string): Promise<LeaveRequest> {
    const { data } = await apiClient.post<LeaveRequest>(`/requests/${id}/deny`);
    return data;
  },
};
