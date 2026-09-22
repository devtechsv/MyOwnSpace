using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Dtos.Requests;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Requests;

namespace OwnSpaceAPI.Api.Controllers;

[ApiController]
[Route("api/v1/requests")]
public class RequestsController : ControllerBase
{
  private readonly IRequestsService _requestsService;

  public RequestsController(IRequestsService requestsService)
  {
    _requestsService = requestsService;
  }

  private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

  [HttpGet("mine")]
  [Authorize(Roles = nameof(UserRole.Empleado))]
  public async Task<ActionResult<PagedResult<LeaveRequestResponse>>> ListMine(
    [FromQuery] RequestType? tipo, [FromQuery] DateOnly? fecha,
    [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
  {
    var result = await _requestsService.ListMineAsync(CurrentUserId, tipo, fecha, page, pageSize);
    return Ok(MapPage(result));
  }

  [HttpPost]
  [Authorize(Roles = nameof(UserRole.Empleado))]
  public async Task<ActionResult<LeaveRequestResponse>> Create(CreateLeaveRequestRequest request)
  {
    // request.Tipo no puede ser null acá: [Required] + la validación de
    // modelo automática de [ApiController] ya rechazó la request con 400
    // antes de que este método se ejecute si faltaba.
    var created = await _requestsService.CreateAsync(
        CurrentUserId, request.Tipo!.Value, request.FechaInicio, request.FechaFin,
        request.HoraInicio, request.HoraFin, request.Motivo);
    return StatusCode(StatusCodes.Status201Created, LeaveRequestResponse.FromEntity(created));
  }

  [HttpGet("pending")]
  [Authorize(Roles = nameof(UserRole.Administrador))]
  public async Task<ActionResult<PagedResult<LeaveRequestResponse>>> ListPending(
    [FromQuery] RequestType? tipo, [FromQuery] DateOnly? fecha, [FromQuery] string? nombre,
    [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
  {
    var result = await _requestsService.ListPendingAsync(tipo, fecha, nombre, page, pageSize);
    return Ok(MapPage(result));
  }

  [HttpGet]
  [Authorize(Roles = nameof(UserRole.Administrador))]
  public async Task<ActionResult<PagedResult<LeaveRequestResponse>>> List(
    [FromQuery] RequestStatus? estado, [FromQuery] RequestType? tipo, [FromQuery] DateOnly? fecha, [FromQuery] string? nombre,
    [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
  {
    var result = await _requestsService.ListAllAsync(estado, tipo, fecha, nombre, page, pageSize);
    return Ok(MapPage(result));
  }

  private static PagedResult<LeaveRequestResponse> MapPage(PagedResult<LeaveRequest> page) =>
    new(page.Items.Select(LeaveRequestResponse.FromEntity).ToList(), page.TotalCount, page.Page, page.PageSize);


  [HttpPost("{id:guid}/approve")]
  [Authorize(Roles = nameof(UserRole.Administrador))]
  public async Task<ActionResult<LeaveRequestResponse>> Approve(Guid id)
  {
    var request = await _requestsService.ApproveAsync(id, CurrentUserId);
    return Ok(LeaveRequestResponse.FromEntity(request));
  }

  [HttpPost("{id:guid}/deny")]
  [Authorize(Roles = nameof(UserRole.Administrador))]
  public async Task<ActionResult<LeaveRequestResponse>> Deny(Guid id, DenyRequestRequest request)
  {
    var result = await _requestsService.DenyAsync(id, CurrentUserId, request.Motivo);
    return Ok(LeaveRequestResponse.FromEntity(result));
  }
}
