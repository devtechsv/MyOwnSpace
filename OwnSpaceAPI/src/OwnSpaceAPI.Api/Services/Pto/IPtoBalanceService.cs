namespace OwnSpaceAPI.Api.Services.Pto;

public interface IPtoBalanceService
{
  Task<decimal> CalcularBalanceAsync(Guid employeeId);
}