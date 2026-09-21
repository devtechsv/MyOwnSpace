import {
  mockAuthAdapter,
  mockRequestsAdapter,
  mockUsersAdapter,
  resetMockState,
} from './mock-adapter';
import { mockUsers, mockRequests } from './mock-data';

beforeEach(() => {
  resetMockState();
});

describe('mockAuthAdapter', () => {
  it('login resuelve la sesión cuando el correo existe y el usuario está activo', async () => {
    const session = await mockAuthAdapter.login({
      correo: 'ana.martinez@devtch.com',
      password: 'cualquiera',
    });

    expect(session).toEqual({
      userId: 'u3',
      nombre: 'Ana Martínez',
      rol: 'Empleado',
      estado: 'Activo',
    });
  });

  it('login rechaza cuando el correo no existe', async () => {
    await expect(
      mockAuthAdapter.login({
        correo: 'no-existe@devtch.com',
        password: 'x',
      }),
    ).rejects.toThrow();
  });

  it('login rechaza cuando el usuario está desactivado', async () => {
    await expect(
      mockAuthAdapter.login({
        correo: 'marta.gomez@devtch.com',
        password: 'x',
      }),
    ).rejects.toThrow();
  });

  it('login rechaza cuando el usuario está Pendiente, igual que el backend real', async () => {
    await expect(
      mockAuthAdapter.login({
        correo: 'sofia.nunez@devtch.com', // u5, Pendiente en los fixtures
        password: 'x',
      }),
    ).rejects.toThrow();
  });

  it('login es insensible a mayúsculas/minúsculas en el correo, igual que el backend real', async () => {
    const session = await mockAuthAdapter.login({
      correo: 'ANA.MARTINEZ@DEVTCH.COM',
      password: 'cualquiera',
    });

    expect(session.userId).toBe('u3');
  });

  it('forgotPassword siempre resuelve, exista o no el correo', async () => {
    await expect(
      mockAuthAdapter.forgotPassword({ correo: 'ana.martinez@devtch.com' }),
    ).resolves.toBeUndefined();
    await expect(
      mockAuthAdapter.forgotPassword({ correo: 'no-existe@devtch.com' }),
    ).resolves.toBeUndefined();
  });

  it('setPassword deja Activo al usuario cuyo id coincide con el token', async () => {
    await expect(
      mockAuthAdapter.setPassword({
        token: 'u5', // Sofía Nuñez, Pendiente en los fixtures
        nuevaPassword: 'Dt#2026reto',
      }),
    ).resolves.toBeUndefined();

    const usuarios = await mockUsersAdapter.list();
    const sofia = usuarios.find((u) => u.id === 'u5');
    expect(sofia?.estado).toBe('Activo');
  });

  it('setPassword rechaza si el token no coincide con ningún usuario', async () => {
    await expect(
      mockAuthAdapter.setPassword({
        token: 'no-existe',
        nuevaPassword: 'Dt#2026reto',
      }),
    ).rejects.toThrow();
  });
});

describe('mockRequestsAdapter', () => {
  it('listByEmployee devuelve solo las solicitudes de ese empleado', async () => {
    const result = await mockRequestsAdapter.listByEmployee('u3');

    expect(result).toHaveLength(
      mockRequests.filter((r) => r.employeeId === 'u3').length,
    );
    expect(result.every((r) => r.employeeId === 'u3')).toBe(true);
  });

  it('listPending devuelve solo solicitudes en estado Pendiente', async () => {
    const result = await mockRequestsAdapter.listPending();

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.estado === 'Pendiente')).toBe(true);
  });

  it('create agrega una nueva solicitud en estado Pendiente', async () => {
    const before = await mockRequestsAdapter.listByEmployee('u4');

    const created = await mockRequestsAdapter.create({
      employeeId: 'u4',
      tipo: 'Otro',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-01',
      motivo: 'Trámite personal',
    });

    expect(created.estado).toBe('Pendiente');
    expect(created.id).toBeTruthy();

    const after = await mockRequestsAdapter.listByEmployee('u4');
    expect(after).toHaveLength(before.length + 1);
  });

  it('approve cambia el estado a Aprobada y registra quién revisó', async () => {
    const result = await mockRequestsAdapter.approve('r3', 'u1');

    expect(result.estado).toBe('Aprobada');
    expect(result.reviewedBy).toBe('u1');
    expect(result.reviewedAt).toBeTruthy();
  });

  it('deny cambia el estado a Denegada y registra quién revisó', async () => {
    const result = await mockRequestsAdapter.deny('r5', 'u2');

    expect(result.estado).toBe('Denegada');
    expect(result.reviewedBy).toBe('u2');
  });

  it('approve rechaza si la solicitud no existe', async () => {
    await expect(
      mockRequestsAdapter.approve('no-existe', 'u1'),
    ).rejects.toThrow();
  });

  it('approve rechaza una solicitud que ya no está Pendiente, igual que el backend real', async () => {
    await expect(
      mockRequestsAdapter.approve('r1', 'u1'), // r1 ya está Aprobada en los fixtures
    ).rejects.toThrow();
  });

  it('create rechaza un rango de fechas invertido, igual que el backend real', async () => {
    await expect(
      mockRequestsAdapter.create({
        employeeId: 'u4',
        tipo: 'Otro',
        fechaInicio: '2026-10-05',
        fechaFin: '2026-10-01',
        motivo: 'Fechas invertidas',
      }),
    ).rejects.toThrow();
  });
});

describe('mockUsersAdapter', () => {
  it('list devuelve todos los usuarios', async () => {
    const result = await mockUsersAdapter.list();
    expect(result).toHaveLength(mockUsers.length);
  });

  it('create agrega un usuario nuevo en estado Pendiente', async () => {
    const created = await mockUsersAdapter.create({
      nombre: 'Nuevo Empleado',
      correo: 'nuevo.empleado@devtch.com',
      rol: 'Empleado',
    });

    expect(created.estado).toBe('Pendiente');
    expect(created.id).toBeTruthy();

    const list = await mockUsersAdapter.list();
    expect(list).toHaveLength(mockUsers.length + 1);
  });

  it('create rechaza si ya existe un usuario con ese correo', async () => {
    await expect(
      mockUsersAdapter.create({
        nombre: 'Otro Nombre',
        correo: 'ana.martinez@devtch.com', // ya existe en los fixtures
        rol: 'Empleado',
      }),
    ).rejects.toThrow('Ya existe un usuario con ese correo.');
  });

  it('create rechaza el correo duplicado sin importar mayúsculas/minúsculas', async () => {
    await expect(
      mockUsersAdapter.create({
        nombre: 'Otro Nombre',
        correo: 'ANA.MARTINEZ@DEVTCH.COM',
        rol: 'Empleado',
      }),
    ).rejects.toThrow();
  });

  it('update modifica los campos indicados sin tocar el resto', async () => {
    const updated = await mockUsersAdapter.update('u3', {
      nombre: 'Ana M. Martínez',
    });

    expect(updated.nombre).toBe('Ana M. Martínez');
    expect(updated.correo).toBe('ana.martinez@devtch.com');
  });

  it('resetPassword deja al usuario en estado Pendiente', async () => {
    await mockUsersAdapter.resetPassword('u1');

    const list = await mockUsersAdapter.list();
    const julio = list.find((u) => u.id === 'u1');
    expect(julio?.estado).toBe('Pendiente');
  });

  it('toggleStatus alterna entre Activo y Desactivado', async () => {
    const deactivated = await mockUsersAdapter.toggleStatus('u3');
    expect(deactivated.estado).toBe('Desactivado');

    const reactivated = await mockUsersAdapter.toggleStatus('u3');
    expect(reactivated.estado).toBe('Activo');
  });

  it('toggleStatus rechaza un usuario Pendiente, igual que el backend real', async () => {
    await expect(
      mockUsersAdapter.toggleStatus('u5'), // Sofía Núñez, Pendiente en los fixtures
    ).rejects.toThrow();
  });
});
