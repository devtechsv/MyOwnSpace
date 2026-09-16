----------MyOwnSpace--------------

Proyecto relacionado a supervision y aprobación de solicitudes por parte de los empleados donde se encuentran laborando, este permite para que usted pueda generar solicitudes/permisos relacionados a su trabajo, en donde los jefes tendrán la disposición de que te los aprueben o te los niegan, sea cualquiera de los dos estados, se te mandaría un correo electrónico si tu caso fue aprobado o rechazado.

Reglamentos a poner:
- Que pueda permitir que los inicios de sesión sean por tokens que duren dos horas de sesión (aplica si en caso hay mucha inactividad).
- Si un usuario intenta acceder a zonas de la Plataforma donde no tiene acceso, este le regresa un error 404 en que la página no existe, esto por temas de seguridad se implementa.

- Si se intenta acceder a cualquier parte de la Plataforma sin tener un token válido, sería redirigido al login.

- Que permita el modo oscuro desde el inicio de sesión.

- Requisitos de contraseña: +10 caracteres con su debido reglamento.
- No permitir que asignen la contraseña genérica al recuperar o crear.
- Usar la base CRUD.
- Tipos de solicitud: Emergencia, Enfermedead, Permiso personal y Otro.
- Roles: Empleado, Jefe (Admin) y SuperAdmin.
- Que los empleados, Jefes y SuperAdmin puedan cambiar su contraseña en el panel superior extremo derecho.
- Copyright de DevTech 2026.


Tecnología a utilizar:

- C# con ASP.NET.
- SQL de SQL Server.
- Next.js.
- Tecnologías que lleva el proyecto.


