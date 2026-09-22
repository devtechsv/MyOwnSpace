import { mockRequestsAdapter } from '@/services/mocks/mock-adapter';
import { httpRequestsAdapter } from './requests.http-adapter';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
  RequestStatus,
  RequestsListParams,
} from '@/contracts/interfaces/request';
import { PagedResult } from '@/contracts/interfaces/common';
import { USE_REAL_API } from '@/services/use-real-api';

const adapter = USE_REAL_API ? httpRequestsAdapter : mockRequestsAdapter;

async function listByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  return adapter.listByEmployee(employeeId);
}

async function listPending(params: RequestsListParams): Promise<PagedResult<LeaveRequest>> {
  return adapter.listPending(params);
}

async function listAll(
  estado: RequestStatus | undefined,
  params: RequestsListParams,
): Promise<PagedResult<LeaveRequest>> {
  return adapter.listAll(estado, params);
}

async function create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
  return adapter.create(payload);
}

async function approve(id: string, reviewerId: string): Promise<LeaveRequest> {
  return adapter.approve(id, reviewerId);
}

async function deny(id: string, reviewerId: string, motivo: string): Promise<LeaveRequest> {
  return adapter.deny(id, reviewerId, motivo);
}

const requests = {
  listByEmployee,
  listPending,
  listAll,
  create,
  approve,
  deny,
};

export default requests;
