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

    public async Task<User> CreateAsync(string nombre, string correo, UserRole rol)
    {
        if (rol == UserRole.SuperAdmin)
        {
            throw new BadRequestException("El rol SuperAdmin no es asignable desde acá.");
        }

        var correoNormalizado = correo.Trim().ToLowerInvariant();
        var yaExiste = await _db.Users.AnyAsync(u => u.Correo.ToLower() == correoNormalizado);
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
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Dispara la invitación a definir contraseña reutilizando el
        // mismo mecanismo de "olvidé mi contraseña" (Tarea 12) — mismo
        // token de un solo uso, mismo IEmailSender.
        await _passwordResetService.RequestResetAsync(user.Correo);

        return user;
    }

    public async Task<User> UpdateAsync(Guid id, string? nombre, string? correo, UserRole? rol)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");
        EnsureNotSuperAdmin(user);

        if (rol == UserRole.SuperAdmin)
        {
            throw new BadRequestException("El rol SuperAdmin no es asignable desde acá.");
        }

        if (correo is not null)
        {
            var correoNormalizado = correo.Trim().ToLowerInvariant();
            var yaExiste = await _db.Users.AnyAsync(u => u.Id != id && u.Correo.ToLower() == correoNormalizado);
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

        if (rol is not null)
        {
            user.Rol = rol.Value;
            user.SecurityStamp = Guid.NewGuid().ToString("N");
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return user;
    }

     public async Task ResetPasswordAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");
        EnsureNotSuperAdmin(user);

        // Limpiar el hash es lo que hace que el reset sea real: si no,
        // la contraseña vieja sigue funcionando hasta que el usuario
        // complete el link (que además puede no llegar nunca, hoy).
        user.PasswordHash = null;
        user.Estado = UserStatus.Pendiente;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _passwordResetService.RequestResetAsync(user.Correo);
    }

    public async Task<User> ToggleStatusAsync(Guid id)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new NotFoundException($"Usuario {id} no encontrado.");
        EnsureNotSuperAdmin(user);

        if (user.Estado == UserStatus.Pendiente)
        {
            throw new ConflictException("El usuario está Pendiente — no tiene Activo/Desactivado para alternar.");
        }

        user.Estado = user.Estado == UserStatus.Activo ? UserStatus.Desactivado : UserStatus.Activo;
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return user;
    }

    private static void EnsureNotSuperAdmin(User user)
    {
        if (user.Rol == UserRole.SuperAdmin)
        {
            throw new BadRequestException("No se puede modificar una cuenta SuperAdmin desde acá.");
        }
    }
}
