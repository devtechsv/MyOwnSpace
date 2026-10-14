import { mockAuditAdapter } from '@/services/mocks/mock-adapter';
import { httpAuditAdapter } from './audit.http-adapter';
import { AuditLog, AuditLogsListParams } from '@/contracts/interfaces/audit';
import { PagedResult } from '@/contracts/interfaces/common';
import { USE_REAL_API } from '@/services/use-real-api';

const adapter = USE_REAL_API ? httpAuditAdapter : mockAuditAdapter;

async function list(params: AuditLogsListParams): Promise<PagedResult<AuditLog>> {
  return adapter.list(params);
}

const audit = {
  list,
};

export default audit;
