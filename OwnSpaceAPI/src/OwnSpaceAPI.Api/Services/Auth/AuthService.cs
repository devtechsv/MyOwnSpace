using Microsoft.EntityFrameworkCore;
using OwnSpaceAPI.Api.Data;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;

namespace OwnSpaceAPI.Api.Services.Auth;

public sealed class AuthService : IAuthService
{
    private const string CredencialesInvalidasMensaje = "Correo o contraseña inválidos.";

    private readonly AppDbContext _db;
    private readonly IPasswordHashingService _passwordHasher;

    public AuthService(AppDbContext db, IPasswordHashingService passwordHasher)
    {
        _db = db;
        _passwordHasher = passwordHasher;
    }

    public async Task<User> ValidateCredentialsAsync(string correo, string password)
    {
        var correoNormalizado = correo.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Correo.ToLower() == correoNormalizado);

        if (user is null
            || user.Estado == UserStatus.Desactivado
            || user.PasswordHash is null
            || !_passwordHasher.Verify(user, user.PasswordHash, password))
        {
            throw new UnauthorizedException(CredencialesInvalidasMensaje);
        }

        return user;
    }
}
