using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Auth;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Users;

public sealed class UsersService : IUsersService
{
    private readonly AppDbContext _db;
    private readonly IPasswordResetService _passwordResetService;

    public UsersService(AppDbContext db, IPasswordResetService passwordResetService)
    {
        _db = db;
        _passwordResetService = passwordResetService;
    }

    public async Task<List<User>> ListAsync() =>
        await _db.Users.OrderBy(u => u.Nombre).ToListAsync();

     public async Task<User> CreateAsync(string nombre, string correo, UserRole rol, DateOnly fechaIngreso)
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

    public async Task<User> UpdateAsync(Guid id, string? nombre, string? correo, UserRole? rol)
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

    public async Task ResetPasswordAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");

        // IssueTemporaryPasswordAsync ya se encarga de reemplazar el
        // hash, rotar el securityStamp y dejar al usuario en condiciones
        // de loguearse — no hace falta ningún paso intermedio acá (el
        // botón de esto en el admin solo se muestra para usuarios
        // Activo, así que nunca pisa la rama "no-op" pensada para
        // Desactivado en el flujo anónimo de forgot-password).
        await _passwordResetService.IssueTemporaryPasswordAsync(user.Correo);
    }

    public async Task<User> ToggleStatusAsync(Guid id)
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
