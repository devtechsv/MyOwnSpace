import {
  mockAuthAdapter,
  mockRequestsAdapter,
  mockUsersAdapter,
  mockPtoAdapter,
  resetMockState,
} from './mock-adapter';
import { mockUsers, mockRequests } from './mock-data';
import { calcularHorasAcumuladas } from '@/lib/pto-balance-calculator';

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
      mustChangePassword: false,
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

  it('forgotPassword deja Activo y con mustChangePassword al usuario cuyo correo existe', async () => {
    await mockAuthAdapter.forgotPassword({ correo: 'sofia.nunez@devtch.com' }); // u5, Pendiente en los fixtures

    const usuarios = await mockUsersAdapter.list(1, 20);
    const sofia = usuarios.items.find((u) => u.id === 'u5');
    expect(sofia?.estado).toBe('Activo');
    expect(sofia?.mustChangePassword).toBe(true);
  });

  it('forgotPassword no reactiva a un usuario Desactivado', async () => {
    await mockAuthAdapter.forgotPassword({ correo: 'marta.gomez@devtch.com' }); // u6, Desactivado

    const usuarios = await mockUsersAdapter.list(1, 20);
    const marta = usuarios.items.find((u) => u.id === 'u6');
    expect(marta?.estado).toBe('Desactivado');
    expect(marta?.mustChangePassword).toBeFalsy();
  });
});

describe('mockRequestsAdapter', () => {
  it('listByEmployee devuelve solo las solicitudes de ese empleado', async () => {
    const result = await mockRequestsAdapter.listByEmployee('u3', { page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(
      mockRequests.filter((r) => r.employeeId === 'u3').length,
    );
    expect(result.items.every((r) => r.employeeId === 'u3')).toBe(true);
  });

  it('listPending devuelve solo solicitudes en estado Pendiente', async () => {
    const result = await mockRequestsAdapter.listPending({ page: 1, pageSize: 20 });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((r) => r.estado === 'Pendiente')).toBe(true);
  });

  it('listPending ordena de más vieja a más nueva', async () => {
    const result = await mockRequestsAdapter.listPending({ page: 1, pageSize: 20 });

    const fechas = result.items.map((r) => r.createdAt);
    expect(fechas).toEqual([...fechas].sort());
  });

  it('listAll pagina, filtra por tipo/fecha/nombre, y totalCount refleja los filtros', async () => {
    const primeraPagina = await mockRequestsAdapter.listAll(undefined, { page: 1, pageSize: 2 });
    expect(primeraPagina.items).toHaveLength(2);
    expect(primeraPagina.totalCount).toBe(mockRequests.length);

    const porTipo = await mockRequestsAdapter.listAll(undefined, {
      tipo: 'Emergencia',
      page: 1,
      pageSize: 20,
    });
    expect(porTipo.items.every((r) => r.tipo === 'Emergencia')).toBe(true);
    expect(porTipo.totalCount).toBe(porTipo.items.length);

    const porNombre = await mockRequestsAdapter.listAll(undefined, {
      nombre: 'ana mart',
      page: 1,
      pageSize: 20,
    });
    expect(porNombre.items.every((r) => r.employeeNombre === 'Ana Martínez')).toBe(true);
  });

  it('create agrega una nueva solicitud en estado Pendiente', async () => {
    const before = await mockRequestsAdapter.listByEmployee('u4', { page: 1, pageSize: 20 });

    const created = await mockRequestsAdapter.create({
      employeeId: 'u4',
      tipo: 'Otro',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-01',
      motivo: 'Trámite personal',
    });

    expect(created.estado).toBe('Pendiente');
    expect(created.id).toBeTruthy();

    const after = await mockRequestsAdapter.listByEmployee('u4', { page: 1, pageSize: 20 });
    expect(after.items).toHaveLength(before.items.length + 1);
  });

  it('approve cambia el estado a Aprobada y registra quién revisó', async () => {
    const result = await mockRequestsAdapter.approve('r3', 'u1');

    expect(result.estado).toBe('Aprobada');
    expect(result.reviewedBy).toBe('u1');
    expect(result.reviewedAt).toBeTruthy();
  });

  it('deny cambia el estado a Denegada, registra quién revisó y guarda el motivo', async () => {
    const result = await mockRequestsAdapter.deny('r5', 'u2', 'No hay cobertura ese día.');

    expect(result.estado).toBe('Denegada');
    expect(result.reviewedBy).toBe('u2');
    expect(result.motivoRechazo).toBe('No hay cobertura ese día.');
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

  it('create rechaza Tipo=Vacaciones, igual que el backend real (tiene su propio flujo en /pto)', async () => {
    await expect(
      mockRequestsAdapter.create({
        employeeId: 'u4',
        tipo: 'Vacaciones',
        fechaInicio: '2026-10-05',
        fechaFin: '2026-10-05',
        motivo: 'Vacaciones',
      }),
    ).rejects.toThrow('Vacaciones se gestiona exclusivamente desde /pto/requests.');
  });
});

describe('mockUsersAdapter', () => {
  it('list devuelve todos los usuarios', async () => {
    const result = await mockUsersAdapter.list(1, 20);
    expect(result.items).toHaveLength(mockUsers.length);
  });

  it('create agrega un usuario nuevo en estado Pendiente', async () => {
    const created = await mockUsersAdapter.create({
      nombre: 'Nuevo Empleado',
      correo: 'nuevo.empleado@devtch.com',
      rol: 'Empleado',
      fechaIngreso: '2026-01-01',
    });

    expect(created.estado).toBe('Pendiente');
    expect(created.id).toBeTruthy();

    const list = await mockUsersAdapter.list(1, 20);
    expect(list.items).toHaveLength(mockUsers.length + 1);
  });

  it('create rechaza si ya existe un usuario con ese correo', async () => {
    await expect(
      mockUsersAdapter.create({
        nombre: 'Otro Nombre',
        correo: 'ana.martinez@devtch.com', // ya existe en los fixtures
        rol: 'Empleado',
        fechaIngreso: '2026-01-01',
      }),
    ).rejects.toThrow('Ya existe un usuario con ese correo.');
  });

  it('create rechaza el correo duplicado sin importar mayúsculas/minúsculas', async () => {
    await expect(
      mockUsersAdapter.create({
        nombre: 'Otro Nombre',
        correo: 'ANA.MARTINEZ@DEVTCH.COM',
        rol: 'Empleado',
        fechaIngreso: '2026-01-01',
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

  it('resetPassword emite una temporal: queda Activo y con mustChangePassword', async () => {
    await mockUsersAdapter.resetPassword('u1');

    const list = await mockUsersAdapter.list(1, 20);
    const julio = list.items.find((u) => u.id === 'u1');
    expect(julio?.estado).toBe('Activo');
    expect(julio?.mustChangePassword).toBe(true);
  });

  it('toggleStatus alterna entre Activo y Desactivado', async () => {
    const deactivated = await mockUsersAdapter.toggleStatus('u3');
    expect(deactivated.estado).toBe('Desactivado');

    const reactivated = await mockUsersAdapter.toggleStatus('u3');
    expect(reactivated.estado).toBe('Activo');
  });

  it('toggleStatus permite desactivar un usuario Pendiente', async () => {
    const desactivado = await mockUsersAdapter.toggleStatus('u5'); // Sofía Núñez, Pendiente en los fixtures
    expect(desactivado.estado).toBe('Desactivado');
  });

  it('toggleStatus al reactivar un usuario sin contraseña real asignada, vuelve a Pendiente (no Activo)', async () => {
    // u5 (Sofía Núñez) nunca tuvo contrasenaAsignada en los fixtures —
    // simula el caso real: llegó a Desactivado viniendo de Pendiente.
    const desactivado = await mockUsersAdapter.toggleStatus('u5');
    expect(desactivado.estado).toBe('Desactivado');

    const reactivado = await mockUsersAdapter.toggleStatus('u5');
    expect(reactivado.estado).toBe('Pendiente');
    expect(reactivado.fechaDesactivacion).toBeUndefined();
  });

  it('toggleStatus registra fechaDesactivacion al desactivar y la limpia al reactivar', async () => {
    const desactivado = await mockUsersAdapter.toggleStatus('u3');
    expect(desactivado.fechaDesactivacion).toBe(new Date().toISOString().slice(0, 10));

    const reactivado = await mockUsersAdapter.toggleStatus('u3');
    expect(reactivado.fechaDesactivacion).toBeUndefined();
  });
});

describe('mockPtoAdapter', () => {
  it('getBalance calcula el balance con la misma fórmula que el backend real', async () => {
    // u4 (Carlos Rivas) ingresó en 2024-02-01 en los fixtures — sin
    // desactivación, sin consumo, el balance tiene que coincidir
    // exactamente con calcularHorasAcumuladas.
    const { horasDisponibles } = await mockPtoAdapter.getBalance('u4');
    const hoy = new Date().toISOString().slice(0, 10);
    const esperado = calcularHorasAcumuladas('2024-02-01', undefined, hoy);

    expect(horasDisponibles).toBe(esperado);
  });

  it('create rechaza horas fuera de rango (0, 8]', async () => {
    await expect(mockPtoAdapter.create('u4', { fecha: '2026-01-01', horas: 0 })).rejects.toThrow();
    await expect(mockPtoAdapter.create('u4', { fecha: '2026-01-02', horas: 8.5 })).rejects.toThrow();
  });

  it('create rechaza una segunda reserva para la misma fecha', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    await mockPtoAdapter.create('u4', { fecha: hoy, horas: 4 });

    await expect(mockPtoAdapter.create('u4', { fecha: hoy, horas: 2 })).rejects.toThrow(
      'Ya tienes PTO reservado para esa fecha.',
    );
  });

  it('create rechaza si las horas superan el balance disponible', async () => {
    // Ingreso en el futuro: balance 0 garantizado, sin depender de qué
    // día se corra el test (mismo criterio que el test análogo del
    // backend real).
    const mañana = new Date();
    mañana.setDate(mañana.getDate() + 1);
    const nuevo = await mockUsersAdapter.create({
      nombre: 'Sin Balance',
      correo: 'sin.balance@devtch.com',
      rol: 'Empleado',
      fechaIngreso: mañana.toISOString().slice(0, 10),
    });

    await expect(
      mockPtoAdapter.create(nuevo.id, { fecha: new Date().toISOString().slice(0, 10), horas: 1 }),
    ).rejects.toThrow('No tienes balance de PTO suficiente para esa cantidad de horas.');
  });

  it('create descuenta el balance realmente', async () => {
    const antes = await mockPtoAdapter.getBalance('u4');
    const hoy = new Date().toISOString().slice(0, 10);

    await mockPtoAdapter.create('u4', { fecha: hoy, horas: 4 });

    const despues = await mockPtoAdapter.getBalance('u4');
    expect(despues.horasDisponibles).toBe(antes.horasDisponibles - 4);
  });

  it('listCalendario devuelve solo Vacaciones Aprobada, de todos los empleados', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    await mockPtoAdapter.create('u4', { fecha: hoy, horas: 4 });

    const equipo = await mockPtoAdapter.listCalendario();

    expect(equipo.every((r) => r.tipo === 'Vacaciones' && r.estado === 'Aprobada')).toBe(true);
    expect(equipo.some((r) => r.employeeId === 'u4' && r.fechaInicio === hoy)).toBe(true);
  });
});
