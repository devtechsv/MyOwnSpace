import { mockPtoAdapter } from '@/services/mocks/mock-adapter';
import { httpPtoAdapter } from './pto.http-adapter';
import { CreatePtoRequestPayload, PtoBalance } from '@/contracts/interfaces/pto';
import { LeaveRequest } from '@/contracts/interfaces/request';
import { USE_REAL_API } from '@/services/use-real-api';

const adapter = USE_REAL_API ? httpPtoAdapter : mockPtoAdapter;

async function getBalance(employeeId: string): Promise<PtoBalance> {
  return adapter.getBalance(employeeId);
}

async function create(
  employeeId: string,
  payload: CreatePtoRequestPayload,
): Promise<LeaveRequest> {
  return adapter.create(employeeId, payload);
}

async function listCalendario(): Promise<LeaveRequest[]> {
  return adapter.listCalendario();
}

const pto = {
  getBalance,
  create,
  listCalendario,
};

export default pto;
