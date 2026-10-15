import { deleteCookie } from 'cookies-next';
import authApi from '@/services/auth/auth.api';
import { SESSION_COOKIE } from '@/services/auth/session-cookie';
import {
  mockAuditAdapter,
  mockRequestsAdapter,
  mockUsersAdapter,
  resetMockState,
} from './mock-adapter';

const TODO = { page: 1, pageSize: 20 };

// Solo se finge la fecha: el delay del mock usa setTimeout real.
function fijarAhora(iso: string) {
  jest.useFakeTimers({
    now: new Date(iso),
    doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'nextTick', 'queueMicrotask'],
  });
}

beforeEach(async () => {
  resetMockState();
  // Las acciones de usuarios toman al administrador de la sesión, como el
  // backend del JWT.
  await authApi.login({ correo: 'julio.perez@devtch.com', password: 'cualquiera' });
  // Ese login dejó su propia entrada; cada test empieza con la bitácora
  // vacía. Los fixtures conservan los ids, así que la sesión sigue valiendo.
  resetMockState();
});

afterEach(() => {
  deleteCookie(SESSION_COOKIE);
  jest.useRealTimers();
});

describe('mockAuditAdapter', () => {
  it('empieza vacía', async () => {
    const result = await mockAuditAdapter.list(TODO);

    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('registra las acciones de usuarios con el admin de la sesión y el mismo detalle que el backend', async () => {
    const nuevo = await mockUsersAdapter.create({
      nombre: 'Pedro Gómez',
      correo: 'pedro.gomez@devtch.com',
      rol: 'Empleado',
      fechaIngreso: '2026-10-01',
    });
    await mockUsersAdapter.update('u3', { nombre: 'Ana M. Martínez' });
    await mockUsersAdapter.resetPassword('u4');
    await mockUsersAdapter.toggleStatus('u3');

    const { items } = await mockAuditAdapter.list(TODO);

    // La más nueva primero.
    expect(items.map((a) => [a.accion, a.entidadId, a.detalle])).toEqual([
      ['EstadoUsuarioCambiado', 'u3', 'Nuevo estado: Desactivado'],
      ['ContrasenaReseteada', 'u4', null],
      ['UsuarioEditado', 'u3', 'Nombre: Ana M. Martínez, Correo: ana.martinez@devtch.com, Rol: Empleado'],
      ['UsuarioCreado', nuevo.id, 'Correo: pedro.gomez@devtch.com, Rol: Empleado'],
    ]);
    expect(items.every((a) => a.actorId === 'u1' && a.actorNombre === 'Julio Pérez')).toBe(true);
    expect(items.every((a) => a.entidadTipo === 'Usuario')).toBe(true);
  });

  it('registra aprobaciones y denegaciones con el revisor y el motivo', async () => {
    await mockRequestsAdapter.approve('r3', 'u2');
    await mockRequestsAdapter.deny('r6', 'u1', 'Ese día hay entrega');

    const { items } = await mockAuditAdapter.list(TODO);

    expect(items).toMatchObject([
      { accion: 'SolicitudDenegada', actorNombre: 'Julio Pérez', entidadTipo: 'Solicitud', entidadNombre: 'Carlos Rivas', detalle: 'Ese día hay entrega' },
      { accion: 'SolicitudAprobada', actorNombre: 'Laura Sánchez', entidadTipo: 'Solicitud', entidadNombre: 'Ana Martínez', detalle: null },
    ]);
  });

  it('una acción rechazada no deja registro', async () => {
    await mockRequestsAdapter.approve('r3', 'u1');
    await expect(mockRequestsAdapter.approve('r3', 'u1')).rejects.toThrow();
    await expect(mockUsersAdapter.update('u3', { nombre: '   ' })).rejects.toThrow();

    const { totalCount } = await mockAuditAdapter.list(TODO);

    expect(totalCount).toBe(1);
  });

  it('el nombre de lo afectado es el de hoy, el del admin el de ese momento', async () => {
    await mockUsersAdapter.toggleStatus('u4');
    await mockUsersAdapter.update('u4', { nombre: 'Carlos Rivas Mena' });
    await mockUsersAdapter.update('u1', { nombre: 'Julio Pérez Actualizado' });

    const { items } = await mockAuditAdapter.list({ ...TODO, accion: 'EstadoUsuarioCambiado' });

    expect(items[0]).toMatchObject({ actorNombre: 'Julio Pérez', entidadNombre: 'Carlos Rivas Mena' });
  });

  it('filtra por acción', async () => {
    await mockUsersAdapter.resetPassword('u4');
    await mockUsersAdapter.toggleStatus('u3');

    const result = await mockAuditAdapter.list({ ...TODO, accion: 'ContrasenaReseteada' });

    expect(result.totalCount).toBe(1);
    expect(result.items[0].accion).toBe('ContrasenaReseteada');
  });

  it('las fechas son días en hora de El Salvador', async () => {
    // 23:30 del 5 en El Salvador = 05:30 UTC del 6.
    fijarAhora('2026-10-06T05:30:00Z');
    await mockUsersAdapter.resetPassword('u3');
    // 00:30 del 6 en El Salvador.
    fijarAhora('2026-10-06T06:30:00Z');
    await mockUsersAdapter.resetPassword('u4');

    const dia5 = await mockAuditAdapter.list({ ...TODO, desde: '2026-10-05', hasta: '2026-10-05' });
    const dia6 = await mockAuditAdapter.list({ ...TODO, desde: '2026-10-06' });

    expect(dia5.items.map((a) => a.entidadId)).toEqual(['u3']);
    expect(dia6.items.map((a) => a.entidadId)).toEqual(['u4']);
  });

  it('rechaza un "hasta" anterior a "desde", con el mismo mensaje que el backend', async () => {
    await expect(
      mockAuditAdapter.list({ ...TODO, desde: '2026-10-05', hasta: '2026-10-04' }),
    ).rejects.toThrow('La fecha final no puede ser anterior a la inicial.');
  });

  it('pagina', async () => {
    for (const id of ['u3', 'u4', 'u5']) {
      await mockUsersAdapter.resetPassword(id);
    }

    const segunda = await mockAuditAdapter.list({ page: 2, pageSize: 2 });

    expect(segunda.totalCount).toBe(3);
    expect(segunda.items.map((a) => a.entidadId)).toEqual(['u3']);
  });

  it('registra el inicio de sesión con el usuario como actor y como afectado', async () => {
    await authApi.login({ correo: 'ana.martinez@devtch.com', password: 'cualquiera' });

    const [entrada] = (await mockAuditAdapter.list(TODO)).items;

    expect(entrada).toMatchObject({
      accion: 'InicioSesion',
      actorId: 'u3',
      actorNombre: 'Ana Martínez',
      entidadId: 'u3',
      entidadNombre: 'Ana Martínez',
    });
  });

  it('un correo no registrado se registra sin actor, sin afectado y sin el texto escrito', async () => {
    await expect(authApi.login({ correo: 'MiClave#Secreta1', password: 'x' })).rejects.toThrow();

    const { items } = await mockAuditAdapter.list(TODO);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      accion: 'InicioSesionFallido',
      actorId: null,
      actorNombre: '(desconocido)',
      entidadId: null,
      entidadNombre: null,
      detalle: 'Correo no registrado.',
    });
    expect(JSON.stringify(items[0])).not.toContain('MiClave');
  });

  it('una cuenta desactivada se registra con el motivo', async () => {
    await expect(authApi.login({ correo: 'marta.gomez@devtch.com', password: 'x' })).rejects.toThrow();

    const [entrada] = (await mockAuditAdapter.list(TODO)).items;

    expect(entrada).toMatchObject({
      accion: 'InicioSesionFallido',
      actorId: null,
      entidadId: 'u6',
      detalle: 'Cuenta en estado Desactivado.',
    });
  });

  it('el cierre de sesión se registra con el usuario de la sesión', async () => {
    await authApi.logout();

    const [entrada] = (await mockAuditAdapter.list(TODO)).items;

    expect(entrada).toMatchObject({ accion: 'CierreSesion', actorId: 'u1', entidadId: 'u1' });
  });
});
