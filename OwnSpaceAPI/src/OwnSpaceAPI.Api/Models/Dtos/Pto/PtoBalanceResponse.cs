namespace OwnSpaceAPI.Api.Models.Dtos.Pto;

public record PtoBalanceResponse(decimal HorasDisponibles, decimal HorasEnAcumulacion, DateOnly FechaProximoPeriodo);