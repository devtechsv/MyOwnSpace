import apiClient from '@/services/api-client';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
  RequestStatus,
  RequestsListParams,
} from '@/contracts/interfaces/request';
import { PagedResult } from '@/contracts/interfaces/common';

// El backend espera el nombre literal del enum de C# en la query string
// ('PermisoPersonal', sin espacio) — a diferencia del body JSON, donde
// el converter acepta "Permiso personal" (con espacio, lo que usa el
// resto del frontend). El binder de ASP.NET Core para [FromQuery] no
// pasa por ese converter, así que acá se traduce a mano.
function tipoParaQuery(tipo?: string): string | undefined {
  return tipo === 'Permiso personal' ? 'PermisoPersonal' : tipo;
}

function paramsDeListado(params: RequestsListParams, extra?: Record<string, unknown>) {
  return {
    ...extra,
    tipo: tipoParaQuery(params.tipo),
    fecha: params.fecha || undefined,
    nombre: params.nombre || undefined,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export const httpRequestsAdapter = {
  async listByEmployee(
    _employeeId: string, params: RequestsListParams,
  ): Promise<PagedResult<LeaveRequest>> {
    // Backend saca al empleado del JWT, nunca de un parámetro — se
    // mantiene _employeeId en la firma para no tocar los llamados
    // existentes (mock y real comparten la misma interfaz).
    const { data } = await apiClient.get<PagedResult<LeaveRequest>>('/requests/mine', {
      params: paramsDeListado(params),
    });
    return data;
  },

  async listPending(params: RequestsListParams): Promise<PagedResult<LeaveRequest>> {
    const { data } = await apiClient.get<PagedResult<LeaveRequest>>('/requests/pending', {
      params: paramsDeListado(params),
    });
    return data;
  },

  async listAll(
    estado: RequestStatus | undefined,
    params: RequestsListParams,
  ): Promise<PagedResult<LeaveRequest>> {
    const { data } = await apiClient.get<PagedResult<LeaveRequest>>('/requests', {
      params: paramsDeListado(params, { estado }),
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

async deny(id: string, _reviewerId: string, motivo: string): Promise<LeaveRequest> {
    const { data } = await apiClient.post<LeaveRequest>(`/requests/${id}/deny`, { motivo });
    return data;
  },
};
