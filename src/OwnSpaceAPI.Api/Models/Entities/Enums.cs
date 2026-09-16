namespace OwnSpaceAPI.Api.Models.Entities;

public enum UserRole
{
    Empleado,
    Administrador,
    SuperAdmin,
}

public enum UserStatus
{
    Pendiente,
    Activo,
    Desactivado,
}

public enum RequestType
{
    Emergencia,
    Enfermedad,
    PermisoPersonal,
    Otro,
}

public enum RequestStatus
{
    Pendiente,
    Aprobada,
    Denegada,
}
