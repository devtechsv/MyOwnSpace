import apiClient from '@/services/api-client';
import { AuditLog, AuditLogsListParams } from '@/contracts/interfaces/audit';
import { PagedResult } from '@/contracts/interfaces/common';

export const httpAuditAdapter = {
  async list(params: AuditLogsListParams): Promise<PagedResult<AuditLog>> {
    const { data } = await apiClient.get<PagedResult<AuditLog>>('/audit-logs', {
      params: {
        accion: params.accion,
        desde: params.desde || undefined,
        hasta: params.hasta || undefined,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
    return data;
  },
};
