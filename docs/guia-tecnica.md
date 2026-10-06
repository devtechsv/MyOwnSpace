# Guía técnica — MyOwnSpace

Referencia para quien vaya a mantener o extender el proyecto: qué operaciones existen hoy (CRUD) y dónde tocar el código para agregar, cambiar o quitar algo. No repite lo que ya está bien documentado en otro lado — para eso, ver:

- [`README.md`](../README.md) / [`OwnSpaceAPI/README.md`](../OwnSpaceAPI/README.md) — cómo levantar el proyecto en local.
- [`SPEC.md`](../SPEC.md) / [`OwnSpaceAPI/SPEC.md`](../OwnSpaceAPI/SPEC.md) — alcance funcional y reglas de negocio.
- [`OwnSpaceAPI/docs/openapi.yaml`](../OwnSpaceAPI/docs/openapi.yaml) — contrato exacto de cada endpoint (request/response, códigos de error).
- [`OwnSpaceAPI/docs/er-diagram.md`](../OwnSpaceAPI/docs/er-diagram.md) — modelo de datos.
- [`tasks/todo.md`](../tasks/todo.md) / [`OwnSpaceAPI/tasks/todo.md`](../OwnSpaceAPI/tasks/todo.md) — historial de por qué cada cosa quedó como quedó (decisiones, bugs encontrados, qué se dejó fuera de alcance a propósito).

## Arquitectura en una línea

Frontend Next.js 16 (Pages Router, en la raíz del repo) que le habla a un backend .NET 8 en `OwnSpaceAPI/` (un solo proyecto, sin capas Domain/Infrastructure separadas) contra SQL Server vía EF Core. El frontend puede correr contra ese backend real o contra una capa de mocks tipada (`src/services/mocks/`) para desarrollar sin tenerlo levantado — ver la sección "Estructura del repo" del README raíz para el árbol completo de carpetas.

## Referencia de endpoints (CRUD)

Todos bajo `/api/v1`. "Rol" es el único requisito de autorización — todos requieren sesión (cookie `accessToken`) salvo donde dice "público".

### Auth

| Operación | Método y ruta | Rol | Servicio |
|---|---|---|---|
| Iniciar sesión | `POST /auth/login` | público | `AuthService.ValidateCredentialsAsync` |
| Sesión actual (renueva) | `GET /auth/session` | cualquiera | `AuthService.GetActiveUserAsync` |
| Cerrar sesión | `POST /auth/logout` | cualquiera | `AuthService.InvalidateSessionsAsync` |
| Olvidé mi contraseña | `POST /auth/forgot-password` | público | `PasswordResetService.RequestTemporaryPasswordAsync` |
| Cambiar mi contraseña | `POST /auth/change-password` | cualquiera | `AuthService.ChangePasswordAsync` |

**Contraseña temporal, dos flujos distintos:**

- **Olvidé mi contraseña (anónimo):** la temporal se guarda aparte (`Users.TempPasswordHash`, vence en 48 h) y **no toca** la contraseña actual ni las sesiones. El login acepta cualquiera de las dos; solo al entrar con la temporal esta reemplaza a la anterior, se cierran las demás sesiones y se pide el cambio. Límite: 3 solicitudes por correo por hora, además del límite por IP. Pasado el límite responde igual (200) sin enviar nada.
- **Reset del admin y alta de usuario:** `IssueTemporaryPasswordAsync` reemplaza la contraseña en el acto y cierra las sesiones.

Los correos se encolan (`QueuedEmailSender`) y los envía en segundo plano `EmailDispatcher` con Resend: la respuesta no espera a Resend y una falla de envío solo queda en el log. La cola vive en memoria; un reinicio pierde los correos que aún no salieron.

### Users

| Operación | Método y ruta | Rol | Servicio |
|---|---|---|---|
| **C**rear | `POST /users` | Administrador | `UsersService.CreateAsync` |
| **R**ead (paginado) | `GET /users?page=&pageSize=` | Administrador | `UsersService.ListAsync` |
| Read (totales) | `GET /users/stats` | Administrador | `UsersService.GetStatsAsync` |
| **U**pdate | `PATCH /users/{id}` | Administrador | `UsersService.UpdateAsync` |
| Update (contraseña) | `POST /users/{id}/reset-password` | Administrador | `UsersService.ResetPasswordAsync` |
| Update (estado) | `POST /users/{id}/toggle-status` | Administrador | `UsersService.ToggleStatusAsync` |

- `POST /users` acepta un campo opcional `password`: si se envía, se valida con `PasswordRules` (400 si no cumple) y se usa como contraseña temporal; si se omite, se genera una automáticamente. En ambos casos se envía por correo y el usuario debe cambiarla en el primer login.
- `POST /users/{id}/toggle-status` responde 400 si un administrador intenta desactivar su propia cuenta.

No hay **D**elete — un usuario nunca se borra, se desactiva (`Estado = Desactivado`). Ver "Cómo agregar algo nuevo" más abajo si hiciera falta un borrado real.

### Requests (solicitudes de permiso, todos los tipos salvo Vacaciones)

| Operación | Método y ruta | Rol | Servicio |
|---|---|---|---|
| **C**rear | `POST /requests` | Empleado | `RequestsService.CreateAsync` |
| **R**ead (propias, paginado) | `GET /requests/mine?tipo=&fecha=&page=&pageSize=` | Empleado | `RequestsService.ListMineAsync` |
| Read (pendientes, paginado) | `GET /requests/pending?...` | Administrador | `RequestsService.ListPendingAsync` |
| Read (todas, paginado) | `GET /requests?estado=&...` | Administrador | `RequestsService.ListAllAsync` |
| **U**pdate (aprobar) | `POST /requests/{id}/approve` | Administrador | `RequestsService.ApproveAsync` |
| Update (denegar) | `POST /requests/{id}/deny` | Administrador | `RequestsService.DenyAsync` |

No hay **D**elete ni edición del contenido de una solicitud ya creada.

### Pto (vacaciones — flujo propio, separado de Requests)

| Operación | Método y ruta | Rol | Servicio |
|---|---|---|---|
| Ver mi balance | `GET /pto/balance` | Empleado | `PtoBalanceService.ObtenerResumenAsync` |
| **C**rear solicitud de un día | `POST /pto/requests` | Empleado | `PtoRequestsService.CrearAsync` |
| Reclamar horas acumuladas | `POST /pto/claim` | Empleado | `PtoBalanceService.ReclamarAsync` |
| **C**rear vacaciones por rango | `POST /pto/vacation-requests` | Empleado | `PtoRequestsService.SolicitarRangoAsync` |
| **R**ead (equipo) | `GET /pto/calendario?mes=AAAA-MM` | Administrador | `PtoRequestsService.ListarEquipoAsync` |

Tanto la solicitud de un día (`POST /pto/requests`, hasta 8 h) como las vacaciones por rango (`POST /pto/vacation-requests`) nacen **Pendientes** y las resuelve un admin con `POST /requests/{id}/approve|deny`; al aprobar se vuelve a validar el saldo (409 si ya no alcanza). Las dos rechazan con 400 una fecha pasada o un sábado/domingo. Mientras están pendientes, sus horas ya se descuentan del disponible. Ninguna se puede editar ni cancelar desde la API hoy.

`GET /pto/calendario` ("PTO del equipo") devuelve solo vacaciones aprobadas, cada una con `employeeNombre`, y acepta `?mes=AAAA-MM` para traer únicamente las que tocan ese mes (un rango aparece en todos los meses que cruza). El frontend pide siempre el mes seleccionado y arma la lista de empleados del filtro con las filas de ese resultado (filtra por `employeeId`); no consulta `GET /users`.

### AuditLog (bitácora de auditoría)

| Operación | Método y ruta | Rol | Servicio |
|---|---|---|---|
| **R**ead (paginado) | `GET /audit-logs?page=&pageSize=` | Administrador | `AuditLogService.ListarAsync` |

Sin endpoint de escritura pública — se escribe internamente (`AuditLogService.RegistrarAsync`) desde los propios servicios de negocio, nunca desde un controller directamente.

## Cómo agregar algo nuevo, por entidad

### Users

- **Modelo:** `OwnSpaceAPI/src/OwnSpaceAPI.Api/Models/Entities/User.cs`
- **Configuración EF (columnas, índices, constraints):** `Data/AppDbContext.cs`, bloque `modelBuilder.Entity<User>`
- **Reglas de negocio:** `Services/Users/UsersService.cs` (+ interfaz `IUsersService`)
- **Endpoints:** `Controllers/UsersController.cs`
- **Forma de entrada/salida HTTP:** `Models/Dtos/Users/` (`CreateUserRequest`, `UpdateUserRequest`, `UserResponse`, `UserStatsResponse`)
- **Tests:** `tests/OwnSpaceAPI.Tests/Users/UsersServiceTests.cs`
- **Frontend — contrato:** `src/contracts/interfaces/user.ts`
- **Frontend — llamadas a la API:** `src/services/users/users.http-adapter.ts` (real) y `src/services/mocks/mock-adapter.ts` → `mockUsersAdapter` (mock) — **las dos implementan la misma interfaz** (`users.api.ts` elige una según `NEXT_PUBLIC_USE_REAL_API`), así que un cambio de contrato hay que reflejarlo en ambas o el mock queda desincronizado.
- **Frontend — pantalla:** `src/pages/admin/users.tsx`, hook `src/components/pages/admin/useAdminUsers.ts`, tabla `src/components/pages/admin/UsersTable.tsx`

Para agregar un campo nuevo (ej. "Departamento"): entidad → migración (`dotnet ef migrations add ...`) → DTOs de request/response → `UsersService` → contrato del frontend → ambos adapters (http y mock) → formulario (`CreateUserModal`/`EditUserModal`).

### Requests (LeaveRequest)

- **Modelo:** `Models/Entities/LeaveRequest.cs` (también cubre las reservas de PTO — mismo modelo, `Tipo = Vacaciones`) y `Models/Entities/PtoClaim.cs` (reclamos)
- **Configuración EF:** `Data/AppDbContext.cs`, bloque `modelBuilder.Entity<LeaveRequest>` (incluye los `CHECK` de `Tipo`/`Estado` y los índices compuestos para los listados paginados)
- **Reglas de negocio (todo salvo Vacaciones):** `Services/Requests/RequestsService.cs`
- **Reglas de negocio (Vacaciones):** `Services/Pto/PtoRequestsService.cs` + `PtoBalanceService`/`PtoBalanceCalculator`. Modelo (art. 177–180 del Código de Trabajo de El Salvador): 5 h por quincena trabajada se suman a **acumuladas**; el empleado las **reclama** (`PtoClaims` guarda el tramo de quincenas cubierto) antes del 31-dic o se pierden; cada hora pertenece al **año laboral** (por aniversario de ingreso) en que se ganó y se **habilita** al cerrar ese año, si algún año cerrado igual o posterior tuvo ≥ 200 días trabajados (días hábiles − ausencias aprobadas de día completo); lo reclamado no vence. **Disponible** = reclamadas habilitadas − vacaciones aprobadas y pendientes. Las vacaciones descuentan solo lunes a viernes a 8 h y no pueden iniciar en fin de semana (no hay calendario de asuetos). Todo se calcula al vuelo (sin jobs) y con `TimeProvider` inyectado para poder fijar "hoy" en los tests. "Hoy" es siempre la fecha de El Salvador (UTC−6), no la de UTC: en el backend vía `TimeProvider.HoyLocal()` (`Services/FechaLocal.cs`) y en el frontend vía `hoyIso()` (`src/helpers/hoy-iso.ts`); nunca usar `DateOnly.FromDateTime(UtcNow)` ni `toISOString().slice(0, 10)` para fechas de negocio. La fórmula tiene una copia en TypeScript solo para el modo simulado (`src/services/mocks/pto-balance-calculator.ts`); las pantallas usan únicamente la aritmética de días de `src/lib/dias-habiles.ts`, y ESLint les impide importar el mock. Las dos calculadoras corren los mismos casos de `test-data/pto-calculadora-casos.json` (`PtoCalculadoraCasosCompartidosTests.cs` y `pto-balance-calculator.casos.test.ts`): **al cambiar una regla, agrega o ajusta un caso ahí y cambia las dos implementaciones**; si cambias solo una, una de las dos suites falla
- **Endpoints:** `Controllers/RequestsController.cs` y `Controllers/PtoController.cs`
- **DTOs:** `Models/Dtos/Requests/`, `Models/Dtos/Pto/`
- **Tests:** `tests/OwnSpaceAPI.Tests/Requests/`, `tests/OwnSpaceAPI.Tests/Pto/`
- **Frontend — contrato:** `src/contracts/interfaces/request.ts`, `src/contracts/interfaces/pto.ts`
- **Frontend — adapters:** `src/services/requests/requests.http-adapter.ts` / `mockRequestsAdapter`; `src/services/pto/` / `mockPtoAdapter` (mismo criterio de mantener ambos sincronizados)
- **Frontend — pantallas:** `src/pages/index.tsx` (empleado), `src/pages/admin/requests.tsx` (admin), `src/pages/pto.tsx` / `src/pages/admin/pto.tsx`

Para agregar un `Tipo` de solicitud nuevo: enum `RequestType` (`Models/Entities/Enums.cs`) → `CHECK` constraint en `AppDbContext` → migración → tipo del frontend (`RequestType` en `request.ts`) → opciones del filtro/formulario donde corresponda (`CreateRequestModal`, filtros de `RequestsTable`).

### AuditLog

- **Modelo:** `Models/Entities/AuditLog.cs`; acciones/tipos de entidad cerrados en los enums `AuditAction`/`AuditEntityType` (`Models/Entities/Enums.cs`)
- **Servicio:** `Services/Audit/AuditLogService.cs` (+ interfaz `IAuditLogService`) — `RegistrarAsync` no hace `SaveChangesAsync` propio a propósito, así la entrada de auditoría se persiste en el mismo commit que la acción que describe
- **Endpoint de lectura:** `Controllers/AuditLogController.cs`
- **Sin pantalla en el frontend todavía** — hoy solo se consulta vía `GET /audit-logs` (Swagger o un cliente HTTP)

Para instrumentar una acción privilegiada nueva: agregar el valor al enum `AuditAction` (y al `CHECK` constraint de `AppDbContext`) y llamar a `_auditLog.RegistrarAsync(actorId, accion, entidadTipo, entidadId, detalle)` **antes** del `SaveChangesAsync` de esa operación (no después — ver el comentario en `UsersService.CreateAsync` para el porqué).

Para construir la pantalla de admin que falta: un hook tipo `useAuditLog.ts` (mismo patrón de paginación que `useAdminUsers`/`useAdminRequests`) contra `GET /audit-logs`, más una tabla simple (fecha, actor, acción, detalle).

## Convenciones a respetar al tocar cualquier entidad

- **Enums como `string` en la base**, nunca como número — `HasConversion<string>()` + un `CHECK constraint` explícito en `AppDbContext` (ver cualquier bloque `modelBuilder.Entity<T>` como ejemplo).
- **Paginación:** usar el registro genérico `PagedResult<T>` (`Models/Dtos/Common/PagedResult.cs` en el backend, `src/contracts/interfaces/common.ts` en el frontend) y el mismo patrón `PaginarAsync` (clamp de `page`/`pageSize`, `CountAsync` + `Skip`/`Take`) que ya usan `RequestsService`/`UsersService`/`AuditLogService`.
- **Nombres embebidos, no joins:** cuando un listado necesita mostrar el nombre de otro usuario (ej. `employeeNombre` en una solicitud, `ActorNombre` en la bitácora), se guarda una copia del nombre en el momento de escribir, en vez de hacer `Include`/join en cada lectura.
- **Mock y HTTP adapter siempre en sincro:** cualquier cambio de contrato en un `*.api.ts` tiene que reflejarse en su `*.http-adapter.ts` **y** en el mock correspondiente de `src/services/mocks/mock-adapter.ts` — si no, `NEXT_PUBLIC_USE_REAL_API=false` (mocks, usado por buena parte de los tests) queda con un contrato viejo.
- **Español neutro** en todo texto nuevo (comentarios, mensajes de error, UI) — no usar voseo rioplatense (ver commit `3d0a4dd` para el criterio aplicado a lo ya existente).
