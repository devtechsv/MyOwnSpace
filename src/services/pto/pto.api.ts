import { mockPtoAdapter } from '@/services/mocks/mock-adapter';
import { httpPtoAdapter } from './pto.http-adapter';
import {
  CreatePtoRequestPayload,
  CreateVacationRequestPayload,
  PtoBalance,
} from '@/contracts/interfaces/pto';
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

// Pasa todo lo acumulado a reclamado; devuelve el balance actualizado.
async function claim(employeeId: string): Promise<PtoBalance> {
  return adapter.claim(employeeId);
}

async function createVacationRequest(
  employeeId: string,
  payload: CreateVacationRequestPayload,
): Promise<LeaveRequest> {
  return adapter.createVacationRequest(employeeId, payload);
}

// mes: "AAAA-MM" para traer solo las vacaciones que tocan ese mes;
// sin mes, todas. Cada fila trae employeeNombre.
async function listCalendario(mes?: string): Promise<LeaveRequest[]> {
  return adapter.listCalendario(mes);
}

const pto = {
  getBalance,
  create,
  claim,
  createVacationRequest,
  listCalendario,
};

export default pto;
