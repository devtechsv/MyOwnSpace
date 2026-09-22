using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OwnSpaceAPI.Api.Models.Dtos.Common;
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

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<PagedResult<UserResponse>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _usersService.ListAsync(page, pageSize);
        var mapped = new PagedResult<UserResponse>(
            result.Items.Select(UserResponse.FromEntity).ToList(), result.TotalCount, result.Page, result.PageSize);
        return Ok(mapped);
    }

    [HttpGet("stats")]
    public async Task<ActionResult<UserStatsResponse>> Stats()
    {
        var stats = await _usersService.GetStatsAsync();
        return Ok(UserStatsResponse.FromDomain(stats));
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create(CreateUserRequest request)
    {
        // request.Rol no puede ser null acá: [Required] + la validación
        // de modelo automática de [ApiController] ya rechazó la request
        // con 400 antes de que este método se ejecute si faltaba.
        var user = await _usersService.CreateAsync(
            CurrentUserId, request.Nombre, request.Correo, request.Rol!.Value, request.FechaIngreso);
        return StatusCode(StatusCodes.Status201Created, UserResponse.FromEntity(user));
    }

    [HttpPatch("{id:guid}")]
    public async Task<ActionResult<UserResponse>> Update(Guid id, UpdateUserRequest request)
    {
        var user = await _usersService.UpdateAsync(CurrentUserId, id, request.Nombre, request.Correo, request.Rol);
        return Ok(UserResponse.FromEntity(user));
    }

    [HttpPost("{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id)
    {
        await _usersService.ResetPasswordAsync(CurrentUserId, id);
        return Ok();
    }

    [HttpPost("{id:guid}/toggle-status")]
    public async Task<ActionResult<UserResponse>> ToggleStatus(Guid id)
    {
        var user = await _usersService.ToggleStatusAsync(CurrentUserId, id);
        return Ok(UserResponse.FromEntity(user));
    }
}
