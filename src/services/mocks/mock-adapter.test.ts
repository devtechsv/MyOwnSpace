import {
  mockAuthAdapter,
  mockRequestsAdapter,
  mockUsersAdapter,
  mockPtoAdapter,
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
  // Solo se fija Date: los timers siguen reales porque el mock simula
  // latencia con setTimeout. Lunes 2026-10-05; u4 ingresó el 2024-02-01 y
  // tiene reclamado su 2do año laboral (120h habilitadas) en los fixtures.
  beforeEach(() => {
    jest.useFakeTimers({
      now: new Date('2026-10-05T12:00:00Z'),
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'nextTick', 'queueMicrotask'],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('getBalance separa acumuladas, reclamadas por habilitar y disponibles', async () => {
    expect(await mockPtoAdapter.getBalance('u4')).toMatchObject({
      horasDisponibles: 120,
      // Sin reclamar desde 2026-02-01: 15-feb..30-sep = 16 cortes.
      horasAcumuladas: 80,
      horasReclamadasBloqueadas: 0,
      fechaProximaHabilitacion: '2027-02-01',
      diasTrabajadosMinimos: 200,
      fechaLimiteReclamo: '2026-12-31',
    });
  });

  it('claim pasa lo acumulado a reclamado y no deja reclamarlo dos veces', async () => {
    const despues = await mockPtoAdapter.claim('u4');

    expect(despues.horasAcumuladas).toBe(0);
    expect(despues.horasReclamadasBloqueadas).toBe(80);
    await expect(mockPtoAdapter.claim('u4')).rejects.toThrow(
      'No tienes horas acumuladas para reclamar.',
    );
  });

  it('create rechaza horas fuera de rango (0, 8]', async () => {
    await expect(mockPtoAdapter.create('u4', { fecha: '2026-10-06', horas: 0 })).rejects.toThrow();
    await expect(mockPtoAdapter.create('u4', { fecha: '2026-10-07', horas: 8.5 })).rejects.toThrow();
  });

  it('create rechaza una segunda reserva para la misma fecha', async () => {
    await mockPtoAdapter.create('u4', { fecha: '2026-10-05', horas: 4 });

    await expect(mockPtoAdapter.create('u4', { fecha: '2026-10-05', horas: 2 })).rejects.toThrow(
      'Ya tienes PTO reservado para esa fecha.',
    );
  });

  it('create rechaza si no hay horas reclamadas y habilitadas', async () => {
    // Sin reclamos: aunque haya acumulado, no puede usar nada.
    const nuevo = await mockUsersAdapter.create({
      nombre: 'Sin Reclamos',
      correo: 'sin.reclamos@devtch.com',
      rol: 'Empleado',
      fechaIngreso: '2024-01-15',
    });
    await expect(mockPtoAdapter.create(nuevo.id, { fecha: '2026-10-05', horas: 1 })).rejects.toThrow(
      'No tienes balance de PTO suficiente para esa cantidad de horas.',
    );
  });

  it('create descuenta el balance realmente', async () => {
    await mockPtoAdapter.create('u4', { fecha: '2026-10-05', horas: 4 });

    expect((await mockPtoAdapter.getBalance('u4')).horasDisponibles).toBe(116);
  });

  it('createVacationRequest crea una Pendiente por días hábiles × 8h que aparta saldo', async () => {
    // Jueves 15 a martes 20: 4 días hábiles.
    const solicitud = await mockPtoAdapter.createVacationRequest('u4', {
      fechaInicio: '2026-10-15',
      fechaFin: '2026-10-20',
    });

    expect(solicitud.estado).toBe('Pendiente');
    expect(solicitud.horasSolicitadas).toBe(32);
    expect((await mockPtoAdapter.getBalance('u4')).horasDisponibles).toBe(88);
  });

  it('createVacationRequest rechaza iniciar en fin de semana, fechas pasadas y saldo insuficiente', async () => {
    await expect(
      mockPtoAdapter.createVacationRequest('u4', { fechaInicio: '2026-10-10', fechaFin: '2026-10-14' }),
    ).rejects.toThrow('Las vacaciones no pueden iniciar en sábado ni domingo.');
    await expect(
      mockPtoAdapter.createVacationRequest('u4', { fechaInicio: '2026-10-01', fechaFin: '2026-10-02' }),
    ).rejects.toThrow('No puedes solicitar vacaciones en fechas pasadas.');
    await expect(
      mockPtoAdapter.createVacationRequest('u4', { fechaInicio: '2026-10-12', fechaFin: '2026-11-13' }),
    ).rejects.toThrow('No tienes horas suficientes: necesitas 200h y tienes 120h disponibles.');
  });

  it('una reserva de un día no puede cruzarse con vacaciones pendientes', async () => {
    await mockPtoAdapter.createVacationRequest('u4', { fechaInicio: '2026-10-12', fechaFin: '2026-10-16' });

    await expect(mockPtoAdapter.create('u4', { fecha: '2026-10-14', horas: 8 })).rejects.toThrow(
      'Ya tienes PTO reservado para esa fecha.',
    );
  });

  it('aprobar vacaciones pendientes las pasa a Aprobada', async () => {
    const solicitud = await mockPtoAdapter.createVacationRequest('u4', {
      fechaInicio: '2026-10-12',
      fechaFin: '2026-10-16',
    });

    const aprobada = await mockRequestsAdapter.approve(solicitud.id, 'u1');

    expect(aprobada.estado).toBe('Aprobada');
    expect((await mockPtoAdapter.getBalance('u4')).horasDisponibles).toBe(80);
  });

  it('listCalendario devuelve solo Vacaciones Aprobada, de todos los empleados', async () => {
    await mockPtoAdapter.create('u4', { fecha: '2026-10-05', horas: 4 });
    await mockPtoAdapter.createVacationRequest('u4', { fechaInicio: '2026-10-12', fechaFin: '2026-10-16' });

    const calendario = await mockPtoAdapter.listCalendario();

    expect(calendario).toHaveLength(1);
    expect(calendario.every((r) => r.tipo === 'Vacaciones' && r.estado === 'Aprobada')).toBe(true);
  });
});
