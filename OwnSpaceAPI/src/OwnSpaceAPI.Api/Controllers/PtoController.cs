using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OwnSpaceAPI.Api.Models.Dtos.Pto;
using OwnSpaceAPI.Api.Models.Dtos.Requests;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Pto;

namespace OwnSpaceAPI.Api.Controllers;

[ApiController]
[Route("api/v1/pto")]
public class PtoController : ControllerBase
{
    private readonly IPtoRequestsService _ptoRequestsService;
    private readonly IPtoBalanceService _ptoBalanceService;

    public PtoController(IPtoRequestsService ptoRequestsService, IPtoBalanceService ptoBalanceService)
    {
        _ptoRequestsService = ptoRequestsService;
        _ptoBalanceService = ptoBalanceService;
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("balance")]
    [Authorize(Roles = nameof(UserRole.Empleado))]
    public async Task<ActionResult<PtoBalanceResponse>> GetBalance()
    {
        var balance = await _ptoBalanceService.CalcularBalanceAsync(CurrentUserId);
        return Ok(new PtoBalanceResponse(balance));
    }

    [HttpPost("requests")]
    [Authorize(Roles = nameof(UserRole.Empleado))]
    public async Task<ActionResult<LeaveRequestResponse>> Create(CreatePtoRequestRequest request)
    {
        var created = await _ptoRequestsService.CrearAsync(CurrentUserId, request.Fecha, request.Horas);
        return StatusCode(StatusCodes.Status201Created, LeaveRequestResponse.FromEntity(created));
    }

    [HttpGet("calendario")]
    [Authorize(Roles = nameof(UserRole.Administrador))]
    public async Task<ActionResult<IEnumerable<LeaveRequestResponse>>> ListCalendario()
    {
        var requests = await _ptoRequestsService.ListarEquipoAsync();
        return Ok(requests.Select(LeaveRequestResponse.FromEntity));
    }
}