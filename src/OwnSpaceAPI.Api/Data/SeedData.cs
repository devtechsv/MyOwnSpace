using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync())
        {
            return; // ya sembrada
        }

        var userIds = new Dictionary<string, Guid>
        {
            ["u1"] = Guid.NewGuid(),
            ["u2"] = Guid.NewGuid(),
            ["u3"] = Guid.NewGuid(),
            ["u4"] = Guid.NewGuid(),
            ["u5"] = Guid.NewGuid(),
            ["u6"] = Guid.NewGuid(),
        };

        var now = DateTime.UtcNow;

        var users = new List<User>
        {
            new() { Id = userIds["u1"], Nombre = "Julio Pérez", Correo = "julio.perez@devtch.com", Rol = UserRole.Administrador, Estado = UserStatus.Activo, CreatedAt = now, UpdatedAt = now },
            new() { Id = userIds["u2"], Nombre = "Laura Sánchez", Correo = "laura.sanchez@devtch.com", Rol = UserRole.Administrador, Estado = UserStatus.Activo, CreatedAt = now, UpdatedAt = now },
            new() { Id = userIds["u3"], Nombre = "Ana Martínez", Correo = "ana.martinez@devtch.com", Rol = UserRole.Empleado, Estado = UserStatus.Activo, CreatedAt = now, UpdatedAt = now },
            new() { Id = userIds["u4"], Nombre = "Carlos Rivas", Correo = "carlos.rivas@devtch.com", Rol = UserRole.Empleado, Estado = UserStatus.Activo, CreatedAt = now, UpdatedAt = now },
            new() { Id = userIds["u5"], Nombre = "Sofía Nuñez", Correo = "sofia.nunez@devtch.com", Rol = UserRole.Empleado, Estado = UserStatus.Pendiente, CreatedAt = now, UpdatedAt = now },
            new() { Id = userIds["u6"], Nombre = "Marta Gómez", Correo = "marta.gomez@devtch.com", Rol = UserRole.Empleado, Estado = UserStatus.Desactivado, CreatedAt = now, UpdatedAt = now },
        };

        var requests = new List<LeaveRequest>
        {
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u3"], Tipo = RequestType.Enfermedad, FechaInicio = new DateOnly(2026, 9, 2), FechaFin = new DateOnly(2026, 9, 2), Motivo = "Reposo médico por gripe, certificado adjunto", Estado = RequestStatus.Aprobada, CreatedAt = new DateTime(2026, 8, 30, 13, 0, 0, DateTimeKind.Utc), ReviewedBy = userIds["u1"], ReviewedAt = new DateTime(2026, 8, 31, 9, 15, 0, DateTimeKind.Utc) },
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u3"], Tipo = RequestType.Emergencia, FechaInicio = new DateOnly(2026, 8, 28), FechaFin = new DateOnly(2026, 8, 28), Motivo = "Emergencia familiar", Estado = RequestStatus.Aprobada, CreatedAt = new DateTime(2026, 8, 28, 8, 0, 0, DateTimeKind.Utc), ReviewedBy = userIds["u2"], ReviewedAt = new DateTime(2026, 8, 28, 8, 40, 0, DateTimeKind.Utc) },
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u3"], Tipo = RequestType.PermisoPersonal, FechaInicio = new DateOnly(2026, 9, 10), FechaFin = new DateOnly(2026, 9, 10), Motivo = "Trámite bancario", Estado = RequestStatus.Pendiente, CreatedAt = new DateTime(2026, 9, 8, 11, 20, 0, DateTimeKind.Utc) },
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u3"], Tipo = RequestType.Otro, FechaInicio = new DateOnly(2026, 9, 5), FechaFin = new DateOnly(2026, 9, 5), Motivo = "Mudanza", Estado = RequestStatus.Denegada, CreatedAt = new DateTime(2026, 9, 3, 10, 0, 0, DateTimeKind.Utc), ReviewedBy = userIds["u1"], ReviewedAt = new DateTime(2026, 9, 3, 16, 30, 0, DateTimeKind.Utc) },
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u3"], Tipo = RequestType.PermisoPersonal, FechaInicio = new DateOnly(2026, 9, 14), FechaFin = new DateOnly(2026, 9, 14), Motivo = "Cita médica de control", Estado = RequestStatus.Pendiente, CreatedAt = new DateTime(2026, 9, 11, 9, 0, 0, DateTimeKind.Utc) },
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u4"], Tipo = RequestType.Enfermedad, FechaInicio = new DateOnly(2026, 9, 12), FechaFin = new DateOnly(2026, 9, 13), Motivo = "Reposo médico, certificado adjunto", Estado = RequestStatus.Pendiente, CreatedAt = new DateTime(2026, 9, 11, 14, 0, 0, DateTimeKind.Utc) },
            new() { Id = Guid.NewGuid(), EmployeeId = userIds["u5"], Tipo = RequestType.Emergencia, FechaInicio = new DateOnly(2026, 9, 13), FechaFin = new DateOnly(2026, 9, 13), Motivo = "Emergencia familiar", Estado = RequestStatus.Pendiente, CreatedAt = new DateTime(2026, 9, 13, 7, 30, 0, DateTimeKind.Utc) },
        };

        context.Users.AddRange(users);
        context.LeaveRequests.AddRange(requests);
        await context.SaveChangesAsync();
    }
}