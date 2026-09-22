using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;
using OwnSpaceAPI.Api.Services.Exceptions;
using OwnSpaceAPI.Api.Services.Requests;

namespace OwnSpaceAPI.Tests.Requests;

public class RequestsServiceTests
{
  private sealed class FakeEmailSender : IEmailSender
  {
    public string? UltimoDestinatario { get; private set; }
    public string? UltimoCuerpo { get; private set; }

    public Task SendAsync(string destinatario, string asunto, string cuerpo)
    {
      UltimoDestinatario = destinatario;
      UltimoCuerpo = cuerpo;
      return Task.CompletedTask;
    }
  }

  private static AppDbContext CreateContext() =>
      new(new DbContextOptionsBuilder<AppDbContext>()
          .UseInMemoryDatabase(Guid.NewGuid().ToString())
          .Options);

  private static User CrearUsuario(string nombre, string correo, UserRole rol = UserRole.Empleado) => new()
  {
    Id = Guid.NewGuid(),
    Nombre = nombre,
    Correo = correo,
    Rol = rol,
    Estado = UserStatus.Activo,
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow,
  };

  [Fact]
  public async Task ListMineAsync_SoloDevuelveLasSolicitudesDelEmpleadoIndicado()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    var carlos = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
    db.Users.AddRange(ana, carlos);
    db.LeaveRequests.AddRange(
        NuevaSolicitud(ana.Id),
        NuevaSolicitud(carlos.Id));
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListMineAsync(ana.Id);

    Assert.Single(resultado);
    Assert.Equal(ana.Id, resultado[0].EmployeeId);
  }

  [Fact]
  public async Task ListMineAsync_IncluyeElNombreDelEmpleado()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    db.LeaveRequests.Add(NuevaSolicitud(ana.Id));
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListMineAsync(ana.Id);

    Assert.Equal("Ana Martínez", resultado[0].Employee.Nombre);
  }

  [Fact]
  public async Task CreateAsync_ConDatosValidos_CreaLaSolicitudPendiente()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var creada = await service.CreateAsync(
        ana.Id, RequestType.Enfermedad, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 21),
        horaInicio: null, horaFin: null, "Reposo médico");

    Assert.Equal(RequestStatus.Pendiente, creada.Estado);
    Assert.Equal(ana.Id, creada.EmployeeId);
  }

  [Fact]
  public async Task CreateAsync_ConFechaFinAnteriorAFechaInicio_TiraBadRequest()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
        ana.Id, RequestType.Otro, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 19),
        horaInicio: null, horaFin: null, "Motivo"));
  }

  [Fact]
  public async Task CreateAsync_ConVacaciones_TiraBadRequest()
  {
    // Vacaciones tiene su propio flujo de autoservicio (POST
    // /pto/requests, ver PtoRequestsServiceTests) — este endpoint
    // genérico la rechaza para que nadie la cree esquivando el chequeo
    // de balance de PTO.
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
        ana.Id, RequestType.Vacaciones, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 27),
        horaInicio: null, horaFin: null, "Vacaciones familiares"));

    Assert.Empty(db.LeaveRequests);
  }

  [Fact]
  public async Task CreateAsync_ConHoraDeInicioYFinValidas_LasGuarda()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var creada = await service.CreateAsync(
        ana.Id, RequestType.PermisoPersonal, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 20),
        horaInicio: new TimeOnly(14, 0), horaFin: new TimeOnly(17, 0), "Trámite personal");

    Assert.Equal(new TimeOnly(14, 0), creada.HoraInicio);
    Assert.Equal(new TimeOnly(17, 0), creada.HoraFin);
  }

  [Fact]
  public async Task CreateAsync_ConSoloHoraDeInicio_TiraBadRequest()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
        ana.Id, RequestType.PermisoPersonal, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 20),
        horaInicio: new TimeOnly(14, 0), horaFin: null, "Trámite personal"));
  }

  [Fact]
  public async Task CreateAsync_ConHoraFinAnteriorOIgualAHoraInicioElMismoDia_TiraBadRequest()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());

    await Assert.ThrowsAsync<BadRequestException>(() => service.CreateAsync(
        ana.Id, RequestType.PermisoPersonal, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 20),
        horaInicio: new TimeOnly(17, 0), horaFin: new TimeOnly(14, 0), "Trámite personal"));
  }

  [Fact]
  public async Task CreateAsync_ConHoraEnUnRangoDeVariosDias_NoComparaHorasEntreDiasDistintos()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    // HoraInicio (17:00, primer día) > HoraFin (09:00, último día) —
    // sería inválido si se comparara como un solo intervalo, pero acá
    // describen días distintos, así que no debe rechazarse. Tipo=Otro
    // porque Vacaciones ya no pasa por este endpoint genérico.
    var creada = await service.CreateAsync(
        ana.Id, RequestType.Otro, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 22),
        horaInicio: new TimeOnly(17, 0), horaFin: new TimeOnly(9, 0), "Otro");

    Assert.Equal(new TimeOnly(17, 0), creada.HoraInicio);
    Assert.Equal(new TimeOnly(9, 0), creada.HoraFin);
  }

  [Fact]
  public async Task ListPendingAsync_SoloDevuelveLasPendientes()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    var pendiente = NuevaSolicitud(ana.Id);
    var aprobada = NuevaSolicitud(ana.Id);
    aprobada.Estado = RequestStatus.Aprobada;
    db.LeaveRequests.AddRange(pendiente, aprobada);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListPendingAsync(tipo: null, fecha: null, nombre: null, page: 1, pageSize: 20);

    Assert.Single(resultado.Items);
    Assert.Equal(1, resultado.TotalCount);
    Assert.Equal(pendiente.Id, resultado.Items[0].Id);
    Assert.Equal("Ana Martínez", resultado.Items[0].Employee.Nombre);
  }

  [Fact]
  public async Task ListAllAsync_SinFiltro_DevuelveTodas()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    var pendiente = NuevaSolicitud(ana.Id);
    var aprobada = NuevaSolicitud(ana.Id);
    aprobada.Estado = RequestStatus.Aprobada;
    db.LeaveRequests.AddRange(pendiente, aprobada);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListAllAsync(estado: null, tipo: null, fecha: null, nombre: null, page: 1, pageSize: 20);

    Assert.Equal(2, resultado.Items.Count);
    Assert.Equal(2, resultado.TotalCount);
    Assert.All(resultado.Items, r => Assert.Equal("Ana Martínez", r.Employee.Nombre));
  }

  [Fact]
  public async Task ListAllAsync_ConFiltroDeEstado_SoloDevuelveEseEstado()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    var pendiente = NuevaSolicitud(ana.Id);
    var aprobada = NuevaSolicitud(ana.Id);
    aprobada.Estado = RequestStatus.Aprobada;
    db.LeaveRequests.AddRange(pendiente, aprobada);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListAllAsync(RequestStatus.Aprobada, tipo: null, fecha: null, nombre: null, page: 1, pageSize: 20);

    Assert.Single(resultado.Items);
    Assert.Equal(aprobada.Id, resultado.Items[0].Id);
  }

  [Fact]
  public async Task ListAllAsync_ConPaginacion_DevuelveLaPaginaCorrecta()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    // 25 solicitudes, creadas en orden — ListAllAsync ordena descendente
    // por CreatedAt, así que la más nueva (índice 24) es la primera.
    var solicitudes = Enumerable.Range(0, 25)
        .Select(i =>
        {
          var s = NuevaSolicitud(ana.Id);
          s.CreatedAt = DateTime.UtcNow.AddMinutes(i);
          return s;
        })
        .ToList();
    db.LeaveRequests.AddRange(solicitudes);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var pagina2 = await service.ListAllAsync(estado: null, tipo: null, fecha: null, nombre: null, page: 2, pageSize: 10);

    Assert.Equal(10, pagina2.Items.Count);
    Assert.Equal(25, pagina2.TotalCount);
    Assert.Equal(2, pagina2.Page);
    // Página 2 (índices 10-19 en orden descendente) empieza en la
    // solicitud creada 14 minutos después de la primera (24 - 10 = 14).
    Assert.Equal(solicitudes[14].Id, pagina2.Items[0].Id);
  }

  [Fact]
  public async Task ListAllAsync_ConPageMenorAUnoOPageSizeExcesivo_LosAcotaAValoresSeguros()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    db.LeaveRequests.Add(NuevaSolicitud(ana.Id));
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListAllAsync(estado: null, tipo: null, fecha: null, nombre: null, page: 0, pageSize: 500);

    Assert.Equal(1, resultado.Page);
    Assert.Equal(100, resultado.PageSize);
  }

  [Fact]
  public async Task ListAllAsync_ConFiltroDeTipo_SoloDevuelveEseTipo()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    var permiso = NuevaSolicitud(ana.Id);
    permiso.Tipo = RequestType.PermisoPersonal;
    var emergencia = NuevaSolicitud(ana.Id);
    emergencia.Tipo = RequestType.Emergencia;
    db.LeaveRequests.AddRange(permiso, emergencia);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListAllAsync(estado: null, RequestType.Emergencia, fecha: null, nombre: null, page: 1, pageSize: 20);

    Assert.Single(resultado.Items);
    Assert.Equal(emergencia.Id, resultado.Items[0].Id);
  }

  [Fact]
  public async Task ListAllAsync_ConFiltroDeFecha_DevuelveLasQueIncluyenEsaFechaEnSuRango()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    // Rango multi-día que incluye el 15 de septiembre.
    var incluida = NuevaSolicitud(ana.Id);
    incluida.FechaInicio = new DateOnly(2026, 9, 14);
    incluida.FechaFin = new DateOnly(2026, 9, 16);
    var noIncluida = NuevaSolicitud(ana.Id);
    noIncluida.FechaInicio = new DateOnly(2026, 9, 20);
    noIncluida.FechaFin = new DateOnly(2026, 9, 20);
    db.LeaveRequests.AddRange(incluida, noIncluida);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListAllAsync(estado: null, tipo: null, new DateOnly(2026, 9, 15), nombre: null, page: 1, pageSize: 20);

    Assert.Single(resultado.Items);
    Assert.Equal(incluida.Id, resultado.Items[0].Id);
  }

  [Fact]
  public async Task ListAllAsync_ConFiltroDeNombre_BuscaPorNombreDelEmpleadoSinDistinguirMayusculas()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    var carlos = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
    db.Users.AddRange(ana, carlos);
    db.LeaveRequests.AddRange(NuevaSolicitud(ana.Id), NuevaSolicitud(carlos.Id));
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var resultado = await service.ListAllAsync(estado: null, tipo: null, fecha: null, "ana mart", page: 1, pageSize: 20);

    Assert.Single(resultado.Items);
    Assert.Equal("Ana Martínez", resultado.Items[0].Employee.Nombre);
  }

  [Fact]
  public async Task ListAllAsync_TotalCountReflejaLosFiltrosAplicados()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    var carlos = CrearUsuario("Carlos Rivas", "carlos.rivas@devtch.com");
    db.Users.AddRange(ana, carlos);
    db.LeaveRequests.AddRange(NuevaSolicitud(ana.Id), NuevaSolicitud(carlos.Id));
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    // pageSize=1 a propósito: si TotalCount reflejara el total sin
    // filtrar (2) en vez del filtrado (1), este assert lo detectaría.
    var resultado = await service.ListAllAsync(estado: null, tipo: null, fecha: null, "ana", page: 1, pageSize: 1);

    Assert.Equal(1, resultado.TotalCount);
  }

  [Fact]
  public async Task ApproveAsync_MarcaAprobadaConElRevisorYDisparaCorreo()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    var admin = CrearUsuario("Julio Pérez", "julio.perez@devtch.com", UserRole.Administrador);
    db.Users.AddRange(ana, admin);
    var solicitud = NuevaSolicitud(ana.Id);
    db.LeaveRequests.Add(solicitud);
    await db.SaveChangesAsync();

    var emailSender = new FakeEmailSender();
    var service = new RequestsService(db, emailSender);
    var actualizada = await service.ApproveAsync(solicitud.Id, admin.Id);

    Assert.Equal(RequestStatus.Aprobada, actualizada.Estado);
    Assert.Equal(admin.Id, actualizada.ReviewedBy);
    Assert.NotNull(actualizada.ReviewedAt);
    Assert.Equal("ana.martinez@devtch.com", emailSender.UltimoDestinatario);
  }

  [Fact]
  public async Task DenyAsync_MarcaDenegadaConElRevisorYMotivo()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    var admin = CrearUsuario("Laura Sánchez", "laura.sanchez@devtch.com", UserRole.Administrador);
    db.Users.AddRange(ana, admin);
    var solicitud = NuevaSolicitud(ana.Id);
    db.LeaveRequests.Add(solicitud);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var actualizada = await service.DenyAsync(solicitud.Id, admin.Id, "No hay cobertura para ese día");

    Assert.Equal(RequestStatus.Denegada, actualizada.Estado);
    Assert.Equal(admin.Id, actualizada.ReviewedBy);
    Assert.Equal("No hay cobertura para ese día", actualizada.MotivoRechazo);
  }

  [Fact]
  public async Task ApproveAsync_SobreUnaSolicitudYaRevisada_TiraConflict()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    var admin = CrearUsuario("Julio Pérez", "julio.perez@devtch.com", UserRole.Administrador);
    db.Users.AddRange(ana, admin);
    var solicitud = NuevaSolicitud(ana.Id);
    solicitud.Estado = RequestStatus.Aprobada;
    db.LeaveRequests.Add(solicitud);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());

    await Assert.ThrowsAsync<ConflictException>(() => service.ApproveAsync(solicitud.Id, admin.Id));
  }

  [Fact]
  public async Task ApproveAsync_ConIdInexistente_TiraNotFound()
  {
    await using var db = CreateContext();
    var service = new RequestsService(db, new FakeEmailSender());

    await Assert.ThrowsAsync<NotFoundException>(() => service.ApproveAsync(Guid.NewGuid(), Guid.NewGuid()));
  }

  private static LeaveRequest NuevaSolicitud(Guid employeeId) => new()
  {
    Id = Guid.NewGuid(),
    EmployeeId = employeeId,
    Tipo = RequestType.PermisoPersonal,
    FechaInicio = new DateOnly(2026, 9, 20),
    FechaFin = new DateOnly(2026, 9, 20),
    Motivo = "Trámite personal",
    Estado = RequestStatus.Pendiente,
    CreatedAt = DateTime.UtcNow,
  };
}
