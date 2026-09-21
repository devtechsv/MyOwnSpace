using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OwnSpaceAPI.Api.Models.Dtos.Users;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Users;

namespace OwnSpaceAPI.Api.Controllers;

[ApiController]
[Route("api/v1/users")]
[Authorize(Roles = nameof(UserRole.Administrador))]
public class UsersController : ControllerBase
{
    private readonly IUsersService _usersService;

    public UsersController(IUsersService usersService)
    {
        _usersService = usersService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> List()
    {
        var users = await _usersService.ListAsync();
        return Ok(users.Select(UserResponse.FromEntity));
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request)
    {
        // request.Rol no puede ser null acá: [Required] + la validación
        // de modelo automática de [ApiController] ya rechazó la request
        // con 400 antes de que este método se ejecute si faltaba.
        var user = await _usersService.CreateAsync(request.Nombre, request.Correo, request.Rol!.Value, request.FechaIngreso);
        return StatusCode(StatusCodes.Status201Created, UserResponse.FromEntity(user));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request)
    {
        var user = await _usersService.UpdateAsync(id, request.Nombre, request.Correo, request.Rol);
        return Ok(UserResponse.FromEntity(user));
    }

    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        await _usersService.ResetPasswordAsync(id);
        return Ok();
    }

    [HttpPost("{id:guid}/toggle-status")]
    public async Task<ActionResult<UserResponse>> ToggleStatus(Guid id)
    {
        var user = await _usersService.ToggleStatusAsync(id);
        return Ok(UserResponse.FromEntity(user));
    }
}
