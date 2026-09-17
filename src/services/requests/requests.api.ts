import { mockRequestsAdapter } from '@/services/mocks/mock-adapter';
import { httpRequestsAdapter } from './requests.http-adapter';
import { CreateLeaveRequestPayload, LeaveRequest } from '@/contracts/interfaces/request';

const adapter = process.env.NEXT_PUBLIC_USE_REAL_API === 'true' ? httpRequestsAdapter : mockRequestsAdapter;

async function listByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  return adapter.listByEmployee(employeeId);
}

async function listPending(): Promise<LeaveRequest[]> {
  return adapter.listPending();
}

async function create(payload: CreateLeaveRequestPayload): Promise<LeaveRequest> {
  return adapter.create(payload);
}

async function approve(id: string, reviewerId: string): Promise<LeaveRequest> {
  return adapter.approve(id, reviewerId);
}

async function deny(id: string, reviewerId: string): Promise<LeaveRequest> {
  return adapter.deny(id, reviewerId);
}

const requests = {
  listByEmployee,
  listPending,
  create,
  approve,
  deny,
};

export default requests;
