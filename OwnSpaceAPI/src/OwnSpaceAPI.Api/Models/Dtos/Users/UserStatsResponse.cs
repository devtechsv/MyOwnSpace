using OwnSpaceAPI.Api.Services.Users;

namespace OwnSpaceAPI.Api.Models.Dtos.Users;

public record UserStatsResponse(int Total, int Activos, int Pendientes)
{
    public static UserStatsResponse FromDomain(UserStats stats) =>
        new(stats.Total, stats.Activos, stats.Pendientes);
}
