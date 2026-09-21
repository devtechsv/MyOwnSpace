using System.ComponentModel.DataAnnotations;

namespace OwnSpaceAPI.Api.Models.Dtos.Requests;

public record DenyRequestRequest([Required, MaxLength(1000)] string Motivo);