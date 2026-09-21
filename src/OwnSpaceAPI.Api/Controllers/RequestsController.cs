using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
  public async Task<ActionResult<IEnumerable<LeaveRequestResponse>>> ListMine()
  {
    var requests = await _requestsService.ListMineAsync(CurrentUserId);
    return Ok(requests.Select(LeaveRequestResponse.FromEntity));
  }

  [HttpPost]
  [Authorize(Roles = nameof(UserRole.Empleado))]
  public async Task<ActionResult<LeaveRequestResponse>> Create(CreateLeaveRequestRequest request)
  {
    var created = await _requestsService.CreateAsync(
        CurrentUserId, request.Tipo, request.FechaInicio, request.FechaFin, request.Motivo);
    return StatusCode(StatusCodes.Status201Created, LeaveRequestResponse.FromEntity(created));
  }

  [HttpGet("pending")]
  [Authorize(Roles = nameof(UserRole.Administrador))]
  public async Task<ActionResult<IEnumerable<LeaveRequestResponse>>> ListPending()
  {
    var requests = await _requestsService.ListPendingAsync();
    return Ok(requests.Select(LeaveRequestResponse.FromEntity));
  }

  [HttpGet]
  [Authorize(Roles = nameof(UserRole.Administrador))]
  public async Task<ActionResult<IEnumerable<LeaveRequestResponse>>> List([FromQuery] RequestStatus? estado)
  {
    var requests = await _requestsService.ListAllAsync(estado);
    return Ok(requests.Select(LeaveRequestResponse.FromEntity));
  }


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
