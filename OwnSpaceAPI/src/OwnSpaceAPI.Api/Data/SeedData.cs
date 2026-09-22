using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services;

namespace OwnSpaceAPI.Api.Data;

public static class SeedData
{
    private const string ConfigAdminPasswordKey = "Seed:AdminPassword";
    private const string ConfigAdminEmailKey = "Seed:AdminEmail";
    private const string DefaultAdminEmail = "admin@devtch.com";

    // Siembra el primer Administrador si todavía no existe ninguno — sin
    // esto, una base nueva (dev o producción) no tiene forma de crear el
    // primer usuario, porque no hay registro público. Es idempotente y no
    // toca nada si ya hay un Admin: Seed:AdminPassword solo importa la
    // primera vez que corre contra una base vacía. El resto de los
    // usuarios se crean después desde el panel de Admin
    // (UsersService.CreateAsync), no acá.
    public static async Task SeedAdminAsync(
        AppDbContext context,
        IPasswordHashingService hasher,
        IConfiguration configuration,
        ILogger logger)
    {
        if (await context.Users.AnyAsync(u => u.Rol == UserRole.Administrador))
        {
            return;
        }

        var password = configuration[ConfigAdminPasswordKey];
        if (string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "No se configuró {Key} — no se sembró un Administrador inicial. Configuralo " +
                "(appsettings.Development.json en desarrollo, o la variable de entorno " +
                "Seed__AdminPassword en producción) y reiniciá la aplicación.",
                ConfigAdminPasswordKey);
            return;
        }

        if (!PasswordRules.IsValid(password))
        {
            logger.LogWarning(
                "{Key} no cumple la política de contraseñas (mínimo 10 caracteres, mayúscula, " +
                "minúscula, número y carácter especial) — no se sembró el Administrador inicial.",
                ConfigAdminPasswordKey);
            return;
        }

        var correo = configuration[ConfigAdminEmailKey] ?? DefaultAdminEmail;
        var now = DateTime.UtcNow;
        var admin = new User
        {
            Id = Guid.NewGuid(),
            Nombre = "Administrador",
            Correo = correo,
            Rol = UserRole.Administrador,
            Estado = UserStatus.Activo,
            // Igual que cualquier usuario invitado: nace con una temporal
            // que tiene que cambiar en el primer login, y esa temporal
            // vence a las 48h si nadie la usa.
            MustChangePassword = true,
            TempPasswordExpiresAt = now.AddHours(48),
            FechaIngreso = DateOnly.FromDateTime(now),
            CreatedAt = now,
            UpdatedAt = now,
        };
        admin.PasswordHash = hasher.Hash(admin, password);

        context.Users.Add(admin);
        await context.SaveChangesAsync();

        logger.LogInformation("Administrador inicial sembrado: {Correo}", correo);
    }
}
