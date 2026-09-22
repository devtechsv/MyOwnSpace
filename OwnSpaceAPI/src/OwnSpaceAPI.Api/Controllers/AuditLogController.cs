using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OwnSpaceAPI.Api.Models.Dtos.Audit;
using OwnSpaceAPI.Api.Models.Dtos.Common;
using OwnSpaceAPI.Api.Models.Entities;
using OwnSpaceAPI.Api.Services.Audit;

namespace OwnSpaceAPI.Api.Controllers;

[ApiController]
[Route("api/v1/audit-logs")]
[Authorize(Roles = nameof(UserRole.Administrador))]
public class AuditLogController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditLogResponse>>> List(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _auditLogService.ListarAsync(page, pageSize);
        var mapped = new PagedResult<AuditLogResponse>(
            result.Items.Select(AuditLogResponse.FromEntity).ToList(), result.TotalCount, result.Page, result.PageSize);
        return Ok(mapped);
    }
}
