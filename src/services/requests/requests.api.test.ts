import requestsApi from './requests.api';
import { resetMockState } from '@/services/mocks/mock-adapter';

beforeEach(() => {
  resetMockState();
});

describe('requests.api', () => {
  it('listByEmployee delega al mock y devuelve solo las de ese empleado', async () => {
    const result = await requestsApi.listByEmployee('u3');

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.employeeId === 'u3')).toBe(true);
  });

  it('listPending delega al mock y devuelve solo las Pendientes', async () => {
    const result = await requestsApi.listPending();

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.estado === 'Pendiente')).toBe(true);
  });

  it('create agrega una solicitud en estado Pendiente', async () => {
    const created = await requestsApi.create({
      employeeId: 'u4',
      tipo: 'Otro',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-01',
      motivo: 'Prueba',
    });

    expect(created.estado).toBe('Pendiente');
    expect(created.id).toBeTruthy();
  });

  it('approve y deny cambian el estado de la solicitud', async () => {
    const approved = await requestsApi.approve('r3', 'u1');
    expect(approved.estado).toBe('Aprobada');
    expect(approved.reviewedBy).toBe('u1');

    const denied = await requestsApi.deny('r5', 'u2');
    expect(denied.estado).toBe('Denegada');
    expect(denied.reviewedBy).toBe('u2');
  });
});
