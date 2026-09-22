using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Audit;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Users;

public sealed class UsersService : IUsersService
{
    private const int MaxPageSize = 100;

    private readonly AppDbContext _db;
    private readonly IPasswordResetService _passwordResetService;
    private readonly IAuditLogService _auditLog;

    public UsersService(AppDbContext db, IPasswordResetService passwordResetService, IAuditLogService auditLog)
    {
        _db = db;
        _passwordResetService = passwordResetService;
        _auditLog = auditLog;
    }

    public async Task<PagedResult<User>> ListAsync(int page, int pageSize)
    {
        var paginaSegura = Math.Max(1, page);
        var tamañoSeguro = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = _db.Users.OrderBy(u => u.Nombre);
        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((paginaSegura - 1) * tamañoSeguro)
            .Take(tamañoSeguro)
            .ToListAsync();

        return new PagedResult<User>(items, totalCount, paginaSegura, tamañoSeguro);
    }

    public async Task<UserStats> GetStatsAsync()
    {
        // 3 counts separados en vez de traer todo a memoria y contar en
        // C#: con la lista ya paginada en ListAsync, este es el único
        // lugar que necesita totales sobre TODA la tabla, no solo la
        // página actual.
        var total = await _db.Users.CountAsync();
        var activos = await _db.Users.CountAsync(u => u.Estado == UserStatus.Activo);
        var pendientes = await _db.Users.CountAsync(u => u.Estado == UserStatus.Pendiente);
        return new UserStats(total, activos, pendientes);
    }

     public async Task<User> CreateAsync(Guid actorId, string nombre, string correo, UserRole rol, DateOnly fechaIngreso)
    {
        var correoNormalizado = correo.Trim().ToLowerInvariant();
        var yaExiste = await _db.Users.AnyAsync(u => u.Correo == correoNormalizado);
        if (yaExiste)
        {
            throw new ConflictException("Ya existe un usuario con ese correo.");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Nombre = nombre,
            Correo = correo,
            Rol = rol,
            Estado = UserStatus.Pendiente,
            PasswordHash = null,
            FechaIngreso = fechaIngreso,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        // Antes del SaveChangesAsync a propósito: así el registro de
        // auditoría entra en el mismo commit que el alta — si el insert
        // choca contra el índice único de abajo, no queda un audit log
        // huérfano describiendo un usuario que nunca se creó.
        await _auditLog.RegistrarAsync(
            actorId, AuditAction.UsuarioCreado, AuditEntityType.Usuario, user.Id,
            $"Correo: {user.Correo}, Rol: {user.Rol}");
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // La verificación AnyAsync de arriba no es atómica con el
            // insert: dos altas concurrentes con el mismo correo pueden
            // pasar las dos la verificación y una de las dos choca acá
            // contra el índice único — sin este catch, eso daba 500 en
            // vez del 409 que corresponde.
            throw new ConflictException("Ya existe un usuario con ese correo.");
        }

        // Dispara la invitación a definir contraseña reutilizando el
        // mismo mecanismo de "olvidé mi contraseña" (Tarea 12) — mismo
        // token de un solo uso, mismo IEmailSender.
        await _passwordResetService.IssueTemporaryPasswordAsync(user.Correo);

        return user;
    }

    public async Task<User> UpdateAsync(Guid actorId, Guid id, string? nombre, string? correo, UserRole? rol)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");

        if (correo is not null)
        {
            var correoNormalizado = correo.Trim().ToLowerInvariant();
            var yaExiste = await _db.Users.AnyAsync(u => u.Id != id && u.Correo == correoNormalizado);
            if (yaExiste)
            {
                throw new ConflictException("Ya existe un usuario con ese correo.");
            }
            user.Correo = correo;
        }

        if (nombre is not null)
        {
            user.Nombre = nombre;
        }

        if (rol is not null && rol.Value != user.Rol)
        {
            await EnsureNotLastActiveAdminAsync(user);
            user.Rol = rol.Value;
            user.SecurityStamp = Guid.NewGuid().ToString("N");
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _auditLog.RegistrarAsync(
            actorId, AuditAction.UsuarioEditado, AuditEntityType.Usuario, user.Id,
            $"Nombre: {user.Nombre}, Correo: {user.Correo}, Rol: {user.Rol}");
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Mismo caso que en CreateAsync: dos ediciones concurrentes
            // al mismo correo nuevo pueden pasar la verificación las dos.
            throw new ConflictException("Ya existe un usuario con ese correo.");
        }

        return user;
    }

    public async Task ResetPasswordAsync(Guid actorId, Guid id)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");

        await _auditLog.RegistrarAsync(actorId, AuditAction.ContrasenaReseteada, AuditEntityType.Usuario, id);
        await _db.SaveChangesAsync();

        // IssueTemporaryPasswordAsync ya se encarga de reemplazar el
        // hash, rotar el securityStamp y dejar al usuario en condiciones
        // de loguearse — no hace falta ningún paso intermedio acá (el
        // botón de esto en el admin solo se muestra para usuarios
        // Activo, así que nunca pisa la rama "no-op" pensada para
        // Desactivado en el flujo anónimo de forgot-password).
        await _passwordResetService.IssueTemporaryPasswordAsync(user.Correo);
    }

    public async Task<User> ToggleStatusAsync(Guid actorId, Guid id)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");

        // El helper es no-op salvo que el usuario sea un Administrador
        // Activo (nunca puede dejar sin admins) — llamarlo también para
        // un Pendiente es seguro, ya que nunca es Activo.
        if (user.Estado == UserStatus.Pendiente || user.Estado == UserStatus.Activo)
        {
            await EnsureNotLastActiveAdminAsync(user);

            user.Estado = UserStatus.Desactivado;
            user.FechaDesactivacion = DateOnly.FromDateTime(DateTime.UtcNow);
        }
        else
        {
            // Reactivar: si nunca tuvo una contraseña real asignada
            // (llegó a Desactivado directo desde Pendiente — nunca pasó
            // por CreateAsync/IssueTemporaryPasswordAsync), vuelve a
            // Pendiente en vez de Activo, porque no tiene con qué
            // loguearse todavía. Un admin tendría que "Resetear
            // contraseña" aparte para mandarle una temporal.
            user.Estado = user.PasswordHash is null ? UserStatus.Pendiente : UserStatus.Activo;
            user.FechaDesactivacion = null;
        }

        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        await _auditLog.RegistrarAsync(
            actorId, AuditAction.EstadoUsuarioCambiado, AuditEntityType.Usuario, user.Id,
            $"Nuevo estado: {user.Estado}");
        await _db.SaveChangesAsync();

        return user;
    }

    private async Task EnsureNotLastActiveAdminAsync(User user)
    {
        if (user.Rol != UserRole.Administrador || user.Estado != UserStatus.Activo)
        {
            return;
        }

        var otrosAdminsActivos = await _db.Users.CountAsync(
            u => u.Id != user.Id && u.Rol == UserRole.Administrador && u.Estado == UserStatus.Activo);
        if (otrosAdminsActivos == 0)
        {
            throw new ConflictException("No se puede desactivar ni degradar al último administrador activo.");
        }
    }
}
