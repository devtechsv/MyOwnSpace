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
  public async Task CreateAsync_ConDatosValidos_CreaLaSolicitudPendiente()
  {
    await using var db = CreateContext();
    var ana = CrearUsuario("Ana Martínez", "ana.martinez@devtch.com");
    db.Users.Add(ana);
    await db.SaveChangesAsync();

    var service = new RequestsService(db, new FakeEmailSender());
    var creada = await service.CreateAsync(
        ana.Id, RequestType.Enfermedad, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 21), "Reposo médico");

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
        ana.Id, RequestType.Otro, new DateOnly(2026, 9, 20), new DateOnly(2026, 9, 19), "Motivo"));
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
    var resultado = await service.ListPendingAsync();

    Assert.Single(resultado);
    Assert.Equal(pendiente.Id, resultado[0].Id);
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
    var resultado = await service.ListAllAsync(estado: null);

    Assert.Equal(2, resultado.Count);
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
    var resultado = await service.ListAllAsync(RequestStatus.Aprobada);

    Assert.Single(resultado);
    Assert.Equal(aprobada.Id, resultado[0].Id);
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
