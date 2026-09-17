using Microsoft.AspNetCore.Identity;
using OwnSpaceAPI.Api.Models.Entities;

namespace OwnSpaceAPI.Api.Services;

public interface IPasswordHashingService
{
    string Hash(User user, string password);
    bool Verify(User user, string hash, string password);
}

// Envuelve PasswordHasher<T> de ASP.NET Core Identity (parte del framework
// compartido, no requiere paquete NuGet aparte) detrás de nuestra propia
// interfaz — si algún día cambiamos a BCrypt u otra cosa, solo se toca
// esta clase, no los servicios que la consumen.
public sealed class PasswordHashingService : IPasswordHashingService
{
    private readonly PasswordHasher<User> _hasher = new();

    public string Hash(User user, string password) => _hasher.HashPassword(user, password);

    public bool Verify(User user, string hash, string password)
    {
        var result = _hasher.VerifyHashedPassword(user, hash, password);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
