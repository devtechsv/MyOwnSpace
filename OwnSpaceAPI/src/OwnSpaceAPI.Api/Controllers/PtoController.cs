using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OwnSpaceAPI.Api.Models.Dtos.Pto;
using OwnSpaceAPI.Api.Models.Dtos.Requests;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Exceptions;
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
        var resumen = await _ptoBalanceService.ObtenerResumenAsync(CurrentUserId);
        return Ok(PtoBalanceResponse.FromResumen(resumen));
    }

    [HttpPost("claim")]
    [Authorize(Roles = nameof(UserRole.Empleado))]
    public async Task<ActionResult<PtoBalanceResponse>> Claim()
    {
        var resumen = await _ptoBalanceService.ReclamarAsync(CurrentUserId);
        return Ok(PtoBalanceResponse.FromResumen(resumen));
    }

    [HttpPost("vacation-requests")]
    [Authorize(Roles = nameof(UserRole.Empleado))]
    public async Task<ActionResult<LeaveRequestResponse>> CreateVacationRequest(CreateVacationRequestRequest request)
    {
        var created = await _ptoRequestsService.SolicitarRangoAsync(
            CurrentUserId, request.FechaInicio, request.FechaFin, request.Motivo);
        return StatusCode(StatusCodes.Status201Created, LeaveRequestResponse.FromEntity(created));
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
    public async Task<ActionResult<IEnumerable<LeaveRequestResponse>>> ListCalendario([FromQuery] string? mes)
    {
        // mes: "AAAA-MM" (el mismo valor que un <input type="month">).
        // Sin mes devuelve todas, como antes — compatible con clientes viejos.
        DateOnly? inicioMes = null;
        if (!string.IsNullOrWhiteSpace(mes))
        {
            if (!DateOnly.TryParseExact(mes + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed))
            {
                throw new BadRequestException("El mes debe tener el formato AAAA-MM.");
            }
            inicioMes = parsed;
        }

        var requests = await _ptoRequestsService.ListarEquipoAsync(inicioMes);
        return Ok(requests.Select(LeaveRequestResponse.FromEntity));
    }
}