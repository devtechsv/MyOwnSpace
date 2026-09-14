import { mockRequestsAdapter } from '@/services/mocks/mock-adapter';
import {
  CreateLeaveRequestPayload,
  LeaveRequest,
} from '@/contracts/interfaces/request';

async function listByEmployee(employeeId: string): Promise<LeaveRequest[]> {
  return mockRequestsAdapter.listByEmployee(employeeId);
}

async function listPending(): Promise<LeaveRequest[]> {
  return mockRequestsAdapter.listPending();
}

async function create(
  payload: CreateLeaveRequestPayload,
): Promise<LeaveRequest> {
  return mockRequestsAdapter.create(payload);
}

async function approve(id: string, reviewerId: string): Promise<LeaveRequest> {
  return mockRequestsAdapter.approve(id, reviewerId);
}

async function deny(id: string, reviewerId: string): Promise<LeaveRequest> {
  return mockRequestsAdapter.deny(id, reviewerId);
}

const requests = {
  listByEmployee,
  listPending,
  create,
  approve,
  deny,
};

export default requests;
