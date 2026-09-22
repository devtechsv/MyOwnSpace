# Implementation Plan: OwnSpaceAPI (Backend)

## Overview

Construir `OwnSpaceAPI` (.NET 8 + EF Core + SQL Server) según `../SPEC.md`, en el orden que el propio dominio impone: no hay autenticación sin usuarios, no hay solicitudes sin autenticación. **El código lo escribe el usuario; Claude revisa cada tarea al cerrarla** (diseño, seguridad, consistencia con `docs/openapi.yaml`) — no implementa por él, salvo que se pida explícitamente lo contrario para una tarea puntual.

## Architecture Decisions

- **Un solo proyecto Web API con carpetas**, no una solución multi-capa (`SPEC.md` §4) — el tamaño del dominio (3 tablas, 14 endpoints) no justifica la ceremonia de proyectos separados todavía.
- **Contrato primero**: cada endpoint ya está definido en `docs/openapi.yaml` antes de escribir el controller que lo implementa — implementar es "hacer que el código cumpla el contrato ya escrito", no diseñar sobre la marcha.
- **JWT en cookie httpOnly**, sin tabla de sesiones (`SPEC.md` §9, "Open Questions") — logout es del lado del cliente, límite conocido y aceptado para esta etapa.
- **`IEmailSender` como interfaz desde la Tarea 1 del módulo `auth`**, con una implementación stub (loguea, no envía) — para no bloquear ningún endpoint por la falta de un proveedor de correo todavía sin decidir.
- **Reglas de contraseña se re-implementan en C#** (puerto directo de `src/lib/password-rules.ts` del frontend, mismas 6 reglas) — nunca confiar solo en la validación que ya hace el frontend.

## Task List

Ver detalle completo, criterios de aceptación y verificación de cada tarea en `tasks/todo.md`.

### Fase 0 — Fundaciones del proyecto
- [x] Tarea 1: Scaffolding del proyecto (`dotnet new webapi`, estructura de carpetas de `SPEC.md` §4, Swashbuckle/Swagger UI corriendo)
- [x] Tarea 2: `AppDbContext` + connection string (sin entidades todavía) + confirmar conexión a SQL Server local
- [x] Tarea 3: Manejo de errores global (middleware que traduce excepciones a `ProblemDetails`, formato RFC 7807 de `docs/openapi.yaml`)

### Checkpoint: Fundaciones
- [x] `dotnet run` levanta la API y Swagger UI carga en `/swagger`
- [x] La API conecta a SQL Server (aunque sin tablas todavía)

### Fase 1 — Modelo de datos
- [x] Tarea 4: Entidades EF Core (`User`, `LeaveRequest`, `PasswordResetToken`) según `docs/er-diagram.md`
- [x] Tarea 5: Configuración de `AppDbContext` (constraints: unique en `Correo`, CHECK en `Rol`/`Estado`/`Tipo`, FKs) + migración inicial
- [x] Tarea 6: Script de datos de ejemplo (seed) — mismos usuarios/solicitudes que `src/services/mocks/mock-data.ts` del frontend, para probar manualmente con los mismos datos que ya conocemos

### Checkpoint: Modelo de datos
- [x] `dotnet ef database update` crea las 3 tablas sin errores
- [x] Los datos de ejemplo son consultables (ej. con una query directa o un endpoint temporal)

### Fase 2 — Módulo `auth`
- [x] Tarea 7: Servicio de hashing de contraseñas + reglas de contraseña (puerto de `password-rules.ts`)
- [x] Tarea 8: `IEmailSender` + implementación stub
- [x] Tarea 9: `POST /auth/login` (JWT + cookie httpOnly)
- [x] Tarea 10: `GET /auth/session` (validación + renovación deslizante 2h)
- [x] Tarea 11: `POST /auth/logout`
- [x] Tarea 12: `POST /auth/forgot-password` + `POST /auth/set-password` (usa `PasswordResetTokens`)

### Checkpoint: `auth` completo
- [x] Flujo probado a mano con Swagger UI: login válido/inválido, sesión se renueva, logout, olvidé mi contraseña → set-password con el token generado
- [x] `dotnet test` sin errores

### Fase 3 — Autorización por rol
- [x] Tarea 13: Policy/middleware de autorización por rol que devuelve **404** (no 401/403) ante rol insuficiente — una sola vez, reutilizable en todos los endpoints de `users`/`requests`

### Fase 4 — Módulo `users` (requiere Fase 3)
- [x] Tarea 14: `GET /users` + `POST /users` (con validación de correo duplicado → 409)
- [x] Tarea 15: `PATCH /users/{id}`
- [x] Tarea 16: `POST /users/{id}/reset-password` + `POST /users/{id}/toggle-status`

### Fase 5 — Módulo `requests` (requiere Fase 3, paralelizable con Fase 4)
- [x] Tarea 17: `GET /requests/mine` + `POST /requests`
- [x] Tarea 18: `GET /requests/pending` + `POST /requests/{id}/approve` + `POST /requests/{id}/deny`

### Checkpoint: Módulos de negocio completos
- [x] Los 3 flujos de punta a punta funcionan vía Swagger UI, con SQL Server real: empleado crea solicitud → admin la aprueba/deniega; admin crea usuario → queda Pendiente → set-password → Activo
- [x] El Swagger generado por el código no diverge de `docs/openapi.yaml` (mismos 14 endpoints, mismos códigos de estado)

### Fase 6 — Cierre
- [x] Tarea 19: CORS configurado para el origen real del frontend (`AllowCredentials`, sin wildcard)
- [x] Tarea 20: `README.md` de `OwnSpaceAPI` con instrucciones de setup (connection string, migraciones, `dotnet run`)

### Checkpoint: Completo
- [x] Todos los criterios de éxito de `SPEC.md` §10 cumplidos
- [x] Listo para conectar el frontend real (cambiar `services/*.api.ts` de mock a HTTP)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| El contrato (`docs/openapi.yaml`) diverge del código a medida que se implementa | Medio | Cada tarea de endpoint se revisa contra el contrato antes de cerrarse (ver Success Criteria de `SPEC.md`) |
| Sin proveedor de correo real, no se puede probar el envío efectivo | Bajo | `IEmailSender` stub deja el flujo probable de punta a punta (el "envío" se loguea/persiste); conectar el proveedor real es una tarea futura acotada |
| Sin jerarquía jefe-empleado, cualquier Administrador aprueba cualquier solicitud | Bajo (decisión consciente) | Documentado en `SPEC.md` §8 como el comportamiento ya validado por el mock del frontend; revisar si el negocio lo pide más adelante |

## Open Questions

- Ninguna abierta. Quedaron resueltas en `SPEC.md` §11 y luego implementadas post-cierre (ver `tasks/todo.md`): proveedor de correo real (Resend), revocación de sesión (por `SecurityStamp`) y migración del frontend al backend real ya no están fuera de alcance — están hechas.
