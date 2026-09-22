# Task List: OwnSpaceAPI (Backend)

Ver `tasks/plan.md` para el orden de fases y las decisiones de arquitectura. Cada tarea la implementa el usuario; al cerrarla, Claude la revisa contra `../SPEC.md` y `docs/openapi.yaml` (diseño, seguridad, consistencia) — no la implementa, salvo pedido explícito puntual.

---

## Fase 0 — Fundaciones del proyecto

## Task 1: Scaffolding del proyecto ✅

**Description:** `dotnet new webapi` (sin controllers de ejemplo, `-minimal` o clásico según preferencia), reorganizado según la estructura de `SPEC.md` §4 (`Controllers/`, `Models/Entities/`, `Models/Dtos/`, `Services/`, `Data/`). Agregar `Swashbuckle.AspNetCore` y confirmar que Swagger UI sirve en `/swagger`.

**Acceptance criteria:**
- [x] `dotnet build` compila sin warnings
- [x] `dotnet run` levanta la API y `/swagger` muestra la UI (confirmado con `curl` → 200 en `/swagger/index.html`)
- [x] Nullable reference types habilitado en el `.csproj`

**Verification:** `dotnet build`, `dotnet run` + `curl` a `/swagger/index.html`.

**Hallazgos corregidos durante la revisión:**
- `Models/`, `Data/`, `Services/` habían quedado un nivel más arriba de lo debido (`src/` en vez de `src/OwnSpaceAPI.Api/`) — en un `.csproj` SDK-style, archivos fuera de la carpeta del proyecto nunca se compilan como parte de él. Corregido moviéndolas adentro.
- `Controllers/WeatherForecastController.cs` (scaffolding de ejemplo) seguía sin borrar. Eliminado.
- Dos carpetas vacías sueltas (`Domain/`, `Entities/`) en la raíz de `OwnSpaceAPI/`, sin relación con la estructura acordada. Eliminadas.
- No existía `.gitignore` en el repo propio de `OwnSpaceAPI` — agregado (`bin/`, `obj/`, `appsettings.Development.json`).

**Dependencies:** ninguna.

---

## Task 2: `AppDbContext` + connection string ✅

**Description:** Crear `Data/AppDbContext.cs` (vacío de `DbSet`s todavía) y configurar la connection string a SQL Server vía `appsettings.Development.json` (gitignorado — no commitear credenciales reales; `appsettings.json` solo lleva placeholders).

**Acceptance criteria:**
- [x] La API arranca sin error de conexión (puede ser una base vacía recién creada)
- [x] `appsettings.Development.json` está en `.gitignore` de `OwnSpaceAPI`

**Verification:** `dotnet ef dbcontext info` (no solo `dotnet run` — ver nota abajo) → confirma `Provider name: Microsoft.EntityFrameworkCore.SqlServer`, `Database name: OwnSpaceDb`, `Data source: localhost`.

**Nota de verificación:** `dotnet run` arrancaba "sin error" incluso antes de configurar la connection string, porque nada todavía inyecta `AppDbContext` (EF Core no abre conexión hasta que se usa) — falso positivo. `dotnet ef dbcontext info` sí fuerza a resolver el `DbContext` con la configuración real y confirma que está correctamente cableado.

**Entorno confirmado:** SQL Server 2025 Standard Developer Edition corriendo localmente (servicio `MSSQLSERVER`), autenticación de Windows (`Trusted_Connection=True`) — sin usuario/contraseña. `dotnet-ef` 8.0.7 instalado globalmente (más viejo que los paquetes del proyecto, 8.0.31 — no bloqueante, pero conviene `dotnet tool update --global dotnet-ef` antes de la Tarea 5).

**Dependencies:** Task 1.

---

## Task 3: Manejo de errores global ✅

**Description:** Middleware (o `IExceptionHandler` de .NET 8) que traduce excepciones no controladas a `ProblemDetails` (RFC 7807), formato acordado en `docs/openapi.yaml`. Sin esto, cada controller tendría que repetir el mismo try/catch.

**Acceptance criteria:**
- [x] Una excepción no controlada responde con `application/problem+json`, nunca un stack trace crudo
- [x] El `status` HTTP del `ProblemDetails` es coherente con el tipo de error (400/404/409/500)

**Verification:** endpoint temporal (`/debug-throw`, borrado al cerrar la tarea) + `curl.exe -sk -D - -o NUL` para confirmar status y `Content-Type`; body confirmado con `curl.exe -sk` simple. Verificado también que `/debug-throw` vuelve a dar 404 genérico (sin body) una vez borrado el endpoint, y que `/swagger` sigue funcionando.

**Bugs reales encontrados y corregidos durante la revisión** (los tres en `GlobalExceptionHandler.cs`):
1. Faltaba `return true;` al final de `TryHandleAsync` — ni compilaba (CS0161).
2. Faltaba `httpContext.Response.StatusCode = status;` — la respuesta quedaba en el 500 que ASP.NET Core pone por defecto antes de invocar al handler, aunque el body ya mostrara el status correcto (404/409/400).
3. `WriteAsJsonAsync` pisa el `ContentType` seteado antes si no se lo pasa como parámetro propio de la llamada — corregido pasando `contentType: "application/problem+json"` directamente al método en vez de asignar `Response.ContentType` por separado.

**Bug de infraestructura encontrado (no de código):** `app.UseExceptionHandler()` estaba registrado después de `UseSwagger()`/`UseSwaggerUI()` en el pipeline — en ASP.NET Core, un middleware solo captura excepciones de lo que está registrado *después* de él. Se movió al principio del pipeline, inmediatamente después de `builder.Build()`, con un comentario explicando por qué.

**Nota de proceso:** durante la verificación apareció un falso 500 que en realidad venía de un proceso `dotnet run` anterior que había quedado vivo en el puerto 7127 (sin matar) — sirvió para reforzar el hábito de chequear `netstat` antes de levantar el servidor, no solo antes de buildear.

**Dependencies:** Task 1.

---

### Checkpoint: Fundaciones
- [ ] `dotnet run` levanta la API y Swagger UI carga en `/swagger`
- [ ] La API conecta a SQL Server

---

## Fase 1 — Modelo de datos

## Task 4: Entidades EF Core ✅

**Description:** Clases `User`, `LeaveRequest`, `PasswordResetToken` en `Models/Entities/`, con las columnas y tipos de `docs/er-diagram.md`. `Rol`/`Estado`/`Tipo` como `enum` de C# (mapean a `nvarchar` vía conversión de EF Core, no a `int`, para que el valor en la base siga siendo legible).

**Acceptance criteria:**
- [x] Los 3 tipos de solicitud, 3 roles y 3 estados de usuario, 3 estados de solicitud del enum coinciden exactamente con los de `docs/openapi.yaml` (mismos strings, mismo orden no importa)
- [x] Las relaciones (`LeaveRequest.EmployeeId` → `User`, `LeaveRequest.ReviewedBy` → `User` nullable, `PasswordResetToken.UserId` → `User`) están declaradas

**Verification:** `dotnet build` (0 warnings, 0 errores).

**Excepción de proceso:** a pedido explícito del usuario, esta tarea la escribió Claude directamente (en vez de solo guiar) — `Enums.cs`, `User.cs`, `LeaveRequest.cs`, `PasswordResetToken.cs`. Vuelve al flujo normal (usuario escribe, Claude revisa) desde la Tarea 5.

**Nota de diseño:** `RequestType.PermisoPersonal` en C# (los enums no admiten espacios) representa el valor real `"Permiso personal"` — la conversión enum↔string con el espacio se resuelve en `OnModelCreating` (Tarea 5), no acá.

**Dependencies:** Task 2.

---

## Task 5: Configuración de `AppDbContext` + migración inicial ✅

**Description:** `DbSet`s en `AppDbContext`, `OnModelCreating` con los constraints de `docs/er-diagram.md` (índice único en `Correo`, `CHECK` en los enums si EF Core no lo genera solo, `maxLength` en los `nvarchar`). Generar y aplicar la migración inicial.

**Acceptance criteria:**
- [x] `dotnet ef migrations add InitialCreate` genera una migración que crea las 3 tablas
- [x] `dotnet ef database update` la aplica sin error contra SQL Server real
- [x] Un `INSERT` con un correo duplicado falla por el índice único (probado a mano)

**Verification:** `dotnet ef database update` (aplicado sin errores) + `sqlcmd` contra `OwnSpaceDb` real: confirmadas las 4 tablas (3 propias + `__EFMigrationsHistory`), los 4 `CHECK` constraints con su definición exacta, el índice único en `Correo`. Probado a mano: un `INSERT` duplicado en `Correo` rechazado por `IX_Users_Correo`; un `INSERT` con `Rol` inválido rechazado por `CK_Users_Rol`. Datos de prueba limpiados después.

**Bugs reales encontrados y corregidos durante la revisión** (ambos en `AppDbContext.cs`, dentro del `CheckConstraint` de `LeaveRequests`):
1. `"[Tipo] IN (... 'Otro)"` — comilla sin cerrar antes del paréntesis final. La migración generada a partir de esto no compilaba como SQL válido; `dotnet ef database update` habría fallado al crear `LeaveRequests`. Se detectó revisando el archivo de migración generado antes de aplicarlo, no después de que fallara.
2. Faltaba por completo el `CheckConstraint` de `CK_LeaveRequests_Estado` — nunca se había escrito esa segunda llamada a `entity.ToTable(...)`.

Se corrigió el origen (`AppDbContext.cs`), se borró la migración rota (`dotnet ef migrations remove` — segura, la base nunca había llegado a crearse) y se regeneró limpia.

**Dependencies:** Task 4.

---

## Task 6: Datos de ejemplo (seed) ✅

**Description:** Script o `IHostedService`/comando que inserta los mismos usuarios y solicitudes que `src/services/mocks/mock-data.ts` del frontend (Julio Pérez, Laura Sánchez, Ana Martínez, etc.) — para que las pruebas manuales usen datos ya conocidos.

**Acceptance criteria:**
- [x] Los usuarios y solicitudes de ejemplo coinciden en nombre/correo/rol/estado con `mock-data.ts`
- [x] Correr el seed dos veces no duplica datos (idempotente, o solo corre si la tabla está vacía)

**Verification:** corrida real contra SQL Server (no solo lectura de código): `dotnet run` una vez → `sqlcmd` confirma 6 usuarios y 7 solicitudes, con nombres/correos/roles/estados y tipos/fechas/motivos/revisores coincidiendo exactamente con `mock-data.ts`. Verificado también que los caracteres acentuados (`Julio Pérez`, `Sofía Nuñez`, etc.) se guardaron bien (`LEN`/`DATALENGTH` correctos — un `�` que apareció en la salida de la terminal era solo un artefacto de visualización de `sqlcmd`, no un problema real de datos). Segunda corrida de `dotnet run`: mismos 6/7 conteos — confirma idempotencia real, no solo revisión del `if (await context.Users.AnyAsync())` en el código.

**Implementación:** `Data/SeedData.cs`, con un diccionario `string → Guid` para mapear los ids del mock (`"u1"`, `"u3"`, etc.) a los GUID reales y mantener las relaciones (`EmployeeId`, `ReviewedBy`) correctas. Se registró en `Program.cs`, mismo bloque `if (IsDevelopment())` que ya tenía Swagger.

**Decisión de alcance:** todos los usuarios quedan con `PasswordHash = null` — no hace falta contraseña conocida todavía, ya que el login (Tarea 9) es lo que primero la va a necesitar. Se documenta acá para no perderlo de vista al llegar a esa tarea.

**Dependencies:** Task 5.

---

### Checkpoint: Modelo de datos
- [ ] `dotnet ef database update` crea las 3 tablas sin errores
- [ ] Los datos de ejemplo son consultables

---

## Fase 2 — Módulo `auth`

## Task 7: Hashing de contraseñas + reglas de contraseña ✅

**Description:** Servicio de hashing (`PasswordHasher<User>` o `BCrypt.Net-Next`) y el puerto de `src/lib/password-rules.ts` a C# (mismas 6 reglas: 10+ caracteres, mayúscula, minúscula, número, especial, no genérica/no igual a la actual).

**Acceptance criteria:**
- [x] Las 6 reglas son individualmente testeables (misma forma que el original: lista de reglas con `id`/`label`/`test`, no un único booleano)
- [~] La lista de contraseñas genéricas bloqueadas — **diverge a propósito** de `CONTRASENAS_GENERICAS` del frontend, ver nota abajo

**Verification:** `dotnet test` → 16/16 (15 de `PasswordRulesTests` + 1 placeholder del template `xunit`).

**Divergencia encontrada y decisión tomada:** la lista de contraseñas genéricas quedó distinta de la del frontend — perdió `devtech123!` y sumó `12345`/`contrasena`/`contraseña`/`incorrecta`/`incorrecto`. El usuario decidió mantener la lista ampliada del backend (es la que manda, valida server-side) y actualizar el frontend más adelante para que coincida — documentado en `SPEC.md` §11 (Open Questions) para no perderlo de vista.

**Implementación:** `Services/PasswordRules.cs` (reglas + lista de genéricas), `Services/PasswordHashingService.cs` (wrapper sobre `PasswordHasher<User>` de ASP.NET Core Identity — viene en el framework compartido, no requirió paquete NuGet nuevo), registrado como `Singleton` en `Program.cs` (es thread-safe, sin estado propio). El servicio de hashing no tiene test propio todavía — se ejercita de punta a punta en la Tarea 9 (login).

**Dependencies:** Task 1.

---

## Task 8: `IEmailSender` + stub ✅

**Description:** Interfaz `IEmailSender` (`SendAsync(destinatario, asunto, cuerpo)` o similar) con una implementación que loguea/persiste en vez de enviar de verdad — ver `SPEC.md` §11.

**Acceptance criteria:**
- [x] La interfaz no asume ningún proveedor concreto (no hay tipos de SendGrid/SMTP filtrados en la firma)
- [x] Registrada en DI, inyectable en los servicios que la necesiten

**Verification:** `dotnet build` + `LoggingEmailSenderTests` (fake mínimo de `ILogger<T>` para capturar el mensaje formateado, sin agregar Moq/NSubstitute solo para esto) — confirma que `SendAsync` loguea destinatario/asunto/cuerpo.

**Excepción de proceso:** a pedido explícito del usuario ("por agilidad"), Claude implementó directamente las Tareas 8, 9 y 10 en conjunto, en vez de solo guiar.

**Dependencies:** Task 1.

---

## Task 9: `POST /auth/login` ✅

**Description:** Valida credenciales contra `Users` (hash de contraseña), rechaza `Desactivado` con el mismo mensaje genérico que credenciales inválidas, emite JWT y lo setea como cookie httpOnly/Secure `accessToken`.

**Acceptance criteria:**
- [x] Credenciales inválidas y usuario `Desactivado` responden ambos 401 con el mismo mensaje (nunca confirmar cuál fue el motivo)
- [x] El JWT incluye lo necesario para reconstruir `Session` (`userId`, `nombre`, `rol`, `estado`) sin una consulta extra en cada request subsiguiente
- [x] La cookie tiene `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`

**Verification:** `dotnet test` (`AuthServiceTests`, 6 casos con EF Core InMemory) + prueba manual real contra SQL Server real y `curl`: login válido (200, body con enums como string gracias al `JsonStringEnumConverter` agregado), contraseña incorrecta (401, mensaje genérico), correo inexistente (401, mismo mensaje), usuario Desactivado (Marta Gómez, 401, mismo mensaje), headers `Set-Cookie` confirmados con `secure; samesite=lax; httponly; path=/`.

**Bug real encontrado y corregido durante la revisión:** `LoginRequest.cs` usaba `[property: Required, EmailAddress]` en un record con constructor primario — ASP.NET Core 8 rechaza eso en tiempo de ejecución (`InvalidOperationException`, 500 en cualquier `POST /auth/login`) porque exige que las validaciones vayan directo sobre el parámetro del constructor, sin el target `property:`. Corregido sacando `property:`.

**Implementación:** `Services/Auth/AuthService.cs` (valida credenciales), `Services/Auth/JwtTokenService.cs` (emite el JWT, claims `NameIdentifier`/`nombre`/`Role`/`estado`), `Controllers/AuthController.cs`, `UnauthorizedException` agregada a `DomainExceptions.cs`/`GlobalExceptionHandler.cs` (401). Se configuró `AddAuthentication().AddJwtBearer(...)` leyendo el token desde la cookie `accessToken` (no el header `Authorization`) vía `OnMessageReceived`. Se necesitó agregar `public partial class Program {}` al final de `Program.cs` para que `WebApplicationFactory<Program>` (tests de integración futuros) pueda referenciarlo — `Program.cs` usa top-level statements.

**Verificación manual — nota:** para probar contra un usuario con contraseña real se usó un endpoint temporal de desarrollo (`/debug-set-password`, igual patrón que en Tareas 3 y 21) para setearle una contraseña conocida a Julio Pérez vía el `IPasswordHashingService` real — borrado al cerrar la tarea. La contraseña de prueba (`Test1234!`) queda persistida en la base local del usuario (no en el seed versionado) para que pueda seguir probando login manualmente.

**Dependencies:** Tasks 5, 7.

---

## Task 10: `GET /auth/session` ✅

**Description:** Valida el JWT de la cookie; si es válido, reemite uno nuevo con expiración +2h desde ahora (expiración deslizante, ver `SPEC.md` §9) y lo re-setea en la cookie.

**Acceptance criteria:**
- [x] Sin cookie o cookie inválida/expirada → 401
- [x] Cookie válida → 200 con `Session` + cookie renovada (nueva `exp`)

**Verification:** `dotnet test` (`JwtTokenServiceTests`, 2 casos: claims correctos y expiración ~2h) + prueba manual: `GET /auth/session` sin cookie → 401; con la cookie del login → 200 con el mismo `Session`; comparado el `exp` del JWT antes/después de dos llamadas a `/auth/session` — confirmado que avanza (renovación deslizante real, no solo teórica).

**Implementación:** el mismo `AuthController.GetSession()` lee los claims ya validados por el middleware de `[Authorize]` (sin tocar la base — cumple la Nota de diseño de `SPEC.md` §8/§9 de no re-chequear `Estado` en cada heartbeat) y llama de nuevo a `IJwtTokenService.GenerateToken` con los mismos datos para reemitir un token fresco.

**Dependencies:** Task 9.

---

## Task 11: `POST /auth/logout` ✅

**Description:** Borra la cookie `accessToken`. Es un límite ya documentado en `SPEC.md` §11 que el JWT sigue siendo válido si alguien lo copió antes del logout — no requiere lógica de revocación server-side en esta etapa.

**Acceptance criteria:**
- [x] Responde 204 y la respuesta incluye la instrucción de borrar la cookie (`Set-Cookie` con expiración pasada, o el helper equivalente de ASP.NET Core)

**Verification:** prueba manual real: login → `/auth/session` (200) → `logout` (204, `Set-Cookie: accessToken=; expires=Thu, 01 Jan 1970...`) → cookie desaparece del cookie jar de `curl` → `/auth/session` con esa cookie ya vacía responde 401.

**Bug real encontrado y corregido durante la revisión:** `AuthController` quedó con **dos constructores** (el viejo de 2 parámetros sin borrar al agregar el de 3 para la Tarea 12) — compilaba, pero la inyección de dependencias de ASP.NET Core no puede resolver un controller con constructores ambiguos y explota en el primer request real. Corregido borrando el constructor viejo.

**Dependencies:** Task 9.

---

## Task 12: `POST /auth/forgot-password` + `POST /auth/set-password` ✅

**Description:** `forgot-password` siempre responde 200 (exista o no el correo), y si existe genera una fila en `PasswordResetTokens` (token aleatorio, se persiste su hash) + llama a `IEmailSender`. `set-password` valida el token (existe, no usado, no expirado), valida la nueva contraseña contra las reglas de la Tarea 7, hashea, marca el token usado, pasa el usuario a `Activo`.

**Acceptance criteria:**
- [x] `forgot-password` con un correo inexistente responde 200 igual que con uno existente (sin crear token, claro)
- [x] `set-password` con un token ya usado o expirado responde 400
- [x] `set-password` con una contraseña que no cumple las reglas responde 400 con el detalle de qué regla falló

**Verification:** `dotnet test` (`PasswordResetServiceTests`, 6 casos con EF Core InMemory + fake de `IEmailSender`) + flujo manual completo contra SQL Server real: forgot-password para Sofía Nuñez (`Pendiente`, sin contraseña) → token real extraído del log del `LoggingEmailSender` → set-password → confirmado en la base que pasó a `Activo` → login exitoso con la nueva contraseña. Además: reusar el mismo token ya usado → 400 ("El enlace no es válido o ya expiró"); forgot-password con correo inexistente → 200 sin crear nada; repetir la contraseña actual (con una que sí cumple las reglas de longitud) → 400 ("La nueva contraseña no puede ser igual a la actual"), confirmando que la comparación vía `_passwordHasher.Verify` contra el hash viejo funciona de verdad, no solo en teoría.

**Decisión de diseño (divergencia intencional del mock del frontend):** la regla "no puede ser igual a la actual" no se puede implementar comparando texto plano (acá solo existe el hash, con salt aleatorio) — se resolvió verificando la contraseña nueva contra el hash guardado (`_passwordHasher.Verify`), documentado en el propio código y explicado al usuario antes de escribirlo.

**Implementación:** `Services/Auth/{IPasswordResetService,PasswordResetService}.cs` (token aleatorio criptográfico de 32 bytes, vida útil de 1 hora — decisión propia, no estaba en el spec —, se persiste su hash SHA-256 nunca el valor crudo), DTOs `ForgotPasswordRequest`/`SetPasswordRequest`, dos endpoints nuevos en `AuthController`.

**Bug de ubicación de archivos encontrado y corregido:** `IPasswordResetService.cs` y `PasswordResetService.cs` habían quedado guardados en `Models/Dtos/Auth/` en vez de `Services/Auth/` (uno además con el nombre de archivo `IPasswordRequest.cs`, no coincidente con el tipo) — el contenido era correcto, solo la ubicación; movidos a donde correspondía.

**Dependencies:** Tasks 7, 8, 9.

---

### Checkpoint: `auth` completo
- [ ] Flujo probado a mano con Swagger UI: login válido/inválido, sesión se renueva, logout, olvidé mi contraseña → set-password
- [ ] `dotnet test` sin errores

---

## Fase 3 — Autorización por rol

## Task 13: Policy de autorización por rol → 404 ✅

**Description:** Policy/`IAuthorizationHandler` reutilizable que, ante un rol insuficiente, devuelve **404** en vez del 401/403 por defecto de ASP.NET Core — mismo criterio de seguridad que `with-auth.tsx` del frontend (nunca confirmar que una ruta existe si no se tiene acceso). Se aplica una vez y se reutiliza en todos los controllers de `users`/`requests`.

**Acceptance criteria:**
- [x] Un usuario `Empleado` autenticado que llama a un endpoint de `Administrador` recibe 404, no 401/403
- [x] Un request sin cookie a un endpoint protegido sigue respondiendo 401 (eso sí debe distinguirse de "no tenés el rol")

**Verification:** prueba manual real contra `GET /users`: admin → 200; empleado autenticado → **404**; sin cookie → 401. Los tres casos confirmados con `curl` y sesiones reales (login como Julio y como Sofía).

**Implementación:** `Services/Auth/NotFoundOnForbidResultHandler.cs`, implementa `IAuthorizationMiddlewareResultHandler` — intercepta el resultado `Forbidden` (rol insuficiente) y lo reemplaza por 404; el caso `Challenged` (sin sesión válida) sigue su curso normal hacia el 401 de `JwtBearer`. Registrado una sola vez en `Program.cs`, se aplica automáticamente a cualquier `[Authorize(Roles = ...)]` del proyecto.

**Problema real encontrado durante la implementación (namespace incorrecto, no de diseño):** `IAuthorizationMiddlewareResultHandler` vive en `Microsoft.AspNetCore.Authorization`, pero `AuthorizationMiddlewareResultHandler` (la clase default) y `PolicyAuthorizationResult` viven en `Microsoft.AspNetCore.Authorization.Policy` — un namespace no alcanza, hacen falta los dos `using`. Se confirmó por reflexión contra el ensamblado real (`Microsoft.AspNetCore.Authorization.Policy.dll`) antes de corregir, en vez de adivinar.

**Dependencies:** Task 10.

---

## Fase 4 — Módulo `users`

## Task 14: `GET /users` + `POST /users` ✅

**Description:** Lista todos los usuarios; crea uno nuevo en estado `Pendiente`, valida correo duplicado (case-insensitive, 409), genera el token de invitación (reutilizando la lógica de la Tarea 12) y dispara el correo vía `IEmailSender`.

**Acceptance criteria:**
- [x] `POST /users` con un correo ya existente responde 409, no crea nada
- [x] El usuario creado queda en estado `Pendiente`
- [x] `rol` en el body solo acepta `Empleado`/`Administrador` (rechaza `SuperAdmin` — no asignable desde acá, ver `docs/openapi.yaml`)

**Verification:** `dotnet test` (`UsersServiceTests`, 9 casos con EF Core InMemory) + prueba manual real: `GET /users` como admin devuelve los 6+ usuarios reales; `POST /users` válido → 201 + `Pendiente` + correo de invitación logueado (mismo token/mecanismo de la Tarea 12); correo duplicado → 409; rol `SuperAdmin` → 400; un `Empleado` intentando `POST /users` → 404 (confirma que la Tarea 13 ya protege este controller sin código adicional).

**Dependencies:** Task 13.

---

## Task 15: `PATCH /users/{id}` ✅

**Description:** Edita nombre/correo/rol de un usuario existente. Igual chequeo de correo duplicado que en la creación, excluyendo al propio usuario.

**Acceptance criteria:**
- [x] Editar el correo a uno ya usado por otro usuario responde 409
- [x] Editar el propio correo al mismo valor que ya tiene no da falso positivo de duplicado

**Verification:** `dotnet test` (incluido en `UsersServiceTests`) + prueba manual real: editar solo el nombre (200), editar a un correo de otro usuario (409), editar al mismo correo que ya tenía (200, sin falso conflicto), editar un id inexistente (404).

**Bugs reales encontrados y corregidos durante la implementación** (ninguno de diseño, todos mecánicos):
1. `UpdateUserRequest.cs` repitió el mismo error de `[property: EmailAddress]` en un record con constructor primario que ya había aparecido en la Tarea 9 — corregido antes de que llegara a fallar en runtime, no después.
2. `IPasswordResetService.cs`/`PasswordResetService.cs` (de la Tarea 12) habían quedado guardados en `Models/Dtos/Auth/` en vez de `Services/Auth/` — mismo tipo de problema que ya había aparecido antes; se corrigió la ubicación al empezar esta tanda de tareas.

**Dependencies:** Task 14.

---

## Task 16: `POST /users/{id}/reset-password` + `POST /users/{id}/toggle-status` ✅

**Description:** `reset-password`: un admin fuerza el reseteo de la contraseña de cualquier usuario (incluida la propia) — vuelve el estado a `Pendiente`, genera nuevo token, dispara correo. `toggle-status`: alterna `Activo`/`Desactivado`; responde 409 si el usuario está `Pendiente` (no tiene un Activo/Desactivado que alternar).

**Acceptance criteria:**
- [x] `reset-password` sobre un usuario `Activo` lo deja `Pendiente`
- [x] `toggle-status` sobre un usuario `Pendiente` responde 409
- [x] `toggle-status` alterna correctamente en ambos sentidos

**Verification:** `dotnet test` (6 casos nuevos agregados a `UsersServiceTests`) + prueba manual real contra SQL Server: reset-password de Carlos Rivas (Activo → Pendiente, confirmado con `sqlcmd`); toggle-status sobre él ya Pendiente → 409; toggle-status sobre Laura Sánchez en ambos sentidos (Activo→Desactivado→Activo).

**Implementación:** `UsersService.ResetPasswordAsync`/`ToggleStatusAsync`, reutiliza `IPasswordResetService.RequestResetAsync` para el reseteo (mismo mecanismo de token que las Tareas 12/14). Dos endpoints nuevos en `UsersController`.

**Dependencies:** Task 14.

---

## Fase 5 — Módulo `requests`

## Task 17: `GET /requests/mine` + `POST /requests` ✅

**Description:** Lista las solicitudes del empleado autenticado (filtradas por su `userId` del JWT, nunca por un `employeeId` que mande el cliente). Crea una solicitud propia en estado `Pendiente`.

**Acceptance criteria:**
- [x] `GET /requests/mine` nunca puede devolver solicitudes de otro empleado, aunque el cliente intente pasar otro id
- [x] `POST /requests` con `fechaFin` anterior a `fechaInicio` responde 400

**Verification:** `dotnet test` (`RequestsServiceTests`, con InMemory) + prueba manual real: `GET /requests/mine` como Ana Martínez trae sus 5 solicitudes sembradas (coincide con `mock-data.ts`); `POST /requests` válido → 201, `Pendiente`; `fechaFin` anterior a `fechaInicio` → 400; un Administrador llamando `/requests/mine` → 404 (confirma que la Tarea 13 protege también este controller).

**`employeeId` nunca viaja en el body** — `RequestsController.CurrentUserId` lo lee siempre del claim `NameIdentifier` del JWT, no hay forma de que el cliente lo falsifique.

**Nota de verificación:** un primer intento de probar con `curl -d '...'` con una tilde en "motivo" dio un error de deserialización JSON — resultó ser un artefacto de codificación del propio comando de shell (la tilde llegaba mal codificada), no un bug del código. Se confirmó escribiendo el JSON a un archivo UTF-8 real y posteando con `--data-binary @archivo`, que funcionó sin problema.

**Dependencies:** Task 13.

---

## Task 18: `GET /requests/pending` + approve/deny ✅

**Description:** Lista todas las pendientes (sin jerarquía jefe-empleado, ver `SPEC.md` §8). `approve`/`deny` solo aplican sobre solicitudes en estado `Pendiente` (409 si no), setean `ReviewedBy`/`ReviewedAt`, disparan correo al empleado.

**Acceptance criteria:**
- [x] Aprobar/denegar una solicitud que ya no está `Pendiente` responde 409
- [x] `ReviewedBy` queda con el id del admin que hizo la acción (del JWT, no del body)

**Verification:** `dotnet test` (incluido en `RequestsServiceTests`) + prueba manual real: `GET /requests/pending` trae todas las pendientes de todos los empleados; aprobar una → 200, `Aprobada`, `ReviewedBy` = id de Julio (el admin logueado), correo de notificación logueado ("Tu solicitud de PermisoPersonal fue aprobada"); volver a aprobar la misma → 409; denegar otra → 200; un Empleado intentando aprobar → 404.

**Dependencies:** Task 13.

---

### Checkpoint: Módulos de negocio completos
- [x] Los 3 flujos de punta a punta funcionan vía Swagger UI, con SQL Server real
- [x] El Swagger generado por el código no diverge de `docs/openapi.yaml`

**Bug post-cierre encontrado el 2026-09-17, al preparar la conexión con el frontend:** `RequestType.PermisoPersonal` se serializaba/deserializaba como `"PermisoPersonal"` (sin espacio) en el JSON de la API, en vez de `"Permiso personal"` (con espacio) como pide `docs/openapi.yaml` y como lo espera el tipo literal del frontend (`'Permiso personal'`). La causa: el `JsonStringEnumConverter` registrado globalmente en `Program.cs` (Tarea 9) tiene **más prioridad** que un `[JsonConverter]` puesto sobre el tipo enum — hay que ponerlo sobre la *propiedad* que usa el enum para que gane. Corregido agregando `RequestTypeJsonConverter` (mapeo manual, igual criterio que el `HasConversion` de la Tarea 5 pero para JSON en vez de SQL) y aplicándolo con `[property: JsonConverter(typeof(RequestTypeJsonConverter))]` en `CreateLeaveRequestRequest.Tipo` y `LeaveRequestResponse.Tipo`. Verificado en ambas direcciones contra SQL Server real: `POST /requests` acepta `"Permiso personal"` con espacio, y `GET /requests/mine` lo devuelve igual, tanto en el eco inmediato como leído de vuelta de la base.

---

## Fase 6 — Cierre

## Task 19: CORS ✅

**Description:** Configurar CORS para el origen real del frontend (`http://localhost:3000` en desarrollo) con `AllowCredentials()` — necesario porque la cookie de sesión viaja cross-origin. Nunca un wildcard (`*`) combinado con credentials (el navegador lo rechaza igual, pero además sería un hueco de seguridad si se sacara la restricción de origin).

**Acceptance criteria:**
- [x] Un request desde el origen del frontend con `credentials: 'include'` funciona
- [x] Un request desde un origen no listado es rechazado por CORS

**Verification:** prueba manual real con `curl.exe -X OPTIONS` simulando el preflight: desde `http://localhost:3000` → 204 con `Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials: true` y `Access-Control-Allow-Methods` presentes; desde `http://localhost:9999` (no listado) → sigue 204 pero **sin ningún header `Access-Control-Allow-*`** (el servidor no rechaza con error — el navegador es quien bloquea la request real al no encontrar esos headers, comportamiento correcto de CORS).

**Bug real encontrado y corregido durante la implementación:** al aplicar las instrucciones, `builder.Services.AddCors(...)` y `app.UseCors(FrontendCorsPolicy)` quedaron sin la línea `const string FrontendCorsPolicy = "FrontendCorsPolicy";` que las precedía — no compilaba (`CS0103: The name 'FrontendCorsPolicy' does not exist in the current context`). Se había perdido al copiar el bloque de código compartido; corregido agregando la constante.

**Dependencies:** Task 9.

---

## Task 20: `README.md` de OwnSpaceAPI ✅

**Description:** Instrucciones de setup: requisitos (.NET 8 SDK, SQL Server), cómo configurar la connection string local, `dotnet ef database update`, `dotnet run`, dónde está Swagger.

**Acceptance criteria:**
- [x] Alguien sin contexto previo puede clonar y levantar la API siguiendo solo el README

**Verification:** lectura cruzada — confirmado que cubre requisitos, connection string, JWT, CORS, migraciones, cómo levantar la API, dónde está Swagger, y comandos de referencia (`build`/`test`/`ef migrations`).

**Problemas reales encontrados y corregidos:**
1. El archivo había quedado en `src/OwnSpaceAPI.Api/README.md` en vez de la raíz de `OwnSpaceAPI/` (donde GitHub lo muestra automáticamente al entrar al repo).
2. Varios bloques de código Markdown sin el ` ``` ` de cierre (el bloque JSON se mezclaba con el texto siguiente; los comandos `dotnet ef database update` y `dotnet run` no tenían fences en absoluto).
3. El texto "Abrí .../swagger" aparecía duplicado (una vez mal pegado al comando de arriba, otra vez como su propio paso).
4. La sección de comandos usaba `* Comandos:` en vez de un encabezado `## Comandos`.
5. Faltaba la sección final "Estructura".

A pedido explícito del usuario, Claude reescribió el archivo directamente en la ubicación correcta en vez de solo señalar los problemas.

**Dependencies:** todas las anteriores.

---

### Checkpoint: Completo
- [x] Todos los criterios de éxito de `SPEC.md` §10 cumplidos
- [x] Listo para conectar el frontend real

---

## Post-cierre — Puntos Medios del backend (auditoría 2026-09-21)

**Contexto:** tras el análisis profundo del proyecto (Críticos/Malos/Medios/Buenos, basado en los criterios de https://github.com/addyosmani/agent-skills) y de cerrar todos los Críticos, Malos y los Medios del frontend, esta tanda cierra los Medios del backend — 14 de los 15 puntos detectados; el punto 15 (bitácora de auditoría de acciones privilegiadas) se difiere a propósito, ver abajo. Implementado por Claude directamente ("es tu turno" — modo agilidad, no guía).

**Cambios:**
1. `Enums.cs` — `RequestTypeJsonConverter.Read` pasó de `Enum.Parse` a `Enum.TryParse` + `throw new JsonException(...)`: un `tipo` inválido ahora da 400 en vez de 500 (antes `Enum.Parse` tiraba `ArgumentException`, que el `GlobalExceptionHandler` no reconoce como error de cliente).
2. `CreateLeaveRequestRequest.Tipo` y `CreateUserRequest.Rol` pasaron a nullable (`RequestType?`, `UserRole?`): `[Required]` sobre un enum no-nullable es un no-op silencioso en `[ApiController]` — omitir el campo simplemente daba `default(T)` en vez de rechazar la request. Ajustados los call-sites (`request.Tipo!.Value`, `request.Rol!.Value`) con comentario explicando por qué el `!` es seguro ahí.
3. `[MaxLength]` agregado a los campos de texto de los DTOs de entrada que no lo tenían (`Motivo`, `MotivoRechazo`, `Nombre`, `Correo`).
4. `AuthService.ValidateCredentialsAsync` — mitigación de oráculo de tiempo: ahora siempre hace una verificación de hash completa (contra un usuario/hash de relleno si el correo no existe), para que el tiempo de respuesta no distinga "no existe" de "existe pero mal la contraseña".
5. `User.Correo` — colación explícita `Latin1_General_CI_AS` a nivel de columna (antes las consultas hacían `.ToLower()` del lado de C#, no sargable — dependía en silencio del collation por defecto del server). Los `u.Correo.ToLower() == x` se cambiaron a `u.Correo == x` en `AuthService`, `UsersService` y `PasswordResetService`.
6. `UsersService.CreateAsync`/`UpdateAsync` — la verificación de correo duplicado (`AnyAsync`) no es atómica con el insert/update; se agregó try/catch de `DbUpdateException` → `ConflictException` alrededor del `SaveChangesAsync` para cerrar la ventana de carrera (dos altas/ediciones concurrentes con el mismo correo).
7. `PasswordResetService.RequestResetAsync` — antes de generar un token nuevo, invalida (`UsedAt`) todos los tokens sin usar previos del mismo usuario. Antes, pedir varios resets seguidos dejaba varios tokens válidos vivos a la vez.
8. `PasswordResetToken.TokenHash` — índice agregado (no único); antes cada `set-password` hacía table scan.
9. `AuthController` — nuevo helper `DeleteAccessTokenCookie()` que borra la cookie con los mismos atributos (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`) con los que se creó; antes `Response.Cookies.Delete` se llamaba solo con `Path=/`, lo que en algunos navegadores no borra la cookie si los atributos no coinciden.
10. `Program.cs` — `UseCors` movido a *antes* de `UseExceptionHandler` (antes las respuestas de error no llevaban headers CORS, y el navegador las descartaba silenciosamente); agregado `UseHsts()` fuera de desarrollo; agregado middleware inline con `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`; comentario agregado documentando que `SameSite=Lax` asume despliegue same-site (a revisar si el frontend pasa a un dominio distinto al del backend).
11. `GlobalExceptionHandler.TryHandleAsync` — guard de `Response.HasStarted` al inicio: si el body ya empezó a enviarse, loguea y devuelve `false` en vez de intentar tocar el `StatusCode` (que tiraría una segunda excepción tapando la real).
12. `UsersService` — nuevo helper `EnsureNotLastActiveAdminAsync`, llamado desde `UpdateAsync` (al cambiar el rol) y `ToggleStatusAsync` (al desactivar): impide desactivar o degradar al último Administrador activo (`ConflictException`). Es no-op para reactivar o para roles/estados que no aplican.

**Diferido a propósito — punto 15 (bitácora de auditoría de acciones privilegiadas):** no se implementó en esta tanda. Es una feature más grande que el resto (nueva entidad `AuditLog` + tabla + migración + instrumentar ~6 puntos de mutación + tests propios), evaluada como fuera de alcance de un batch de Medios. Queda pendiente como punto propio a futuro.

**Migración:** `AddCorreoCollationAndTokenHashIndex` — `ALTER COLUMN Correo ... COLLATE Latin1_General_CI_AS`, `TokenHash` pasó de `nvarchar(max)` a `nvarchar(450)` (necesario para poder indexarlo — el valor real es un hash SHA-256 en hex, 64 caracteres, sin riesgo real de truncamiento pese al warning de "possible data loss" que tira el scaffolding). Generada y aplicada contra SQL Server real.

**Verification:** `dotnet build` (0 warnings, 0 errores) + `dotnet test`: 72/72 (68 existentes + 4 nuevos en `UsersServiceTests` para el guard del último admin: `ToggleStatusAsync` sobre único admin activo → `ConflictException` y sin cambios; con otro admin activo → sí lo desactiva; `UpdateAsync` degradando al único admin → `ConflictException` y sin cambios; cambiar al mismo rol que ya tiene no dispara el guard).

**Cobertura no agregada — límite real encontrado:** se intentó cubrir también la condición de carrera del punto 6 (`DbUpdateException` → `Conflict`) simulándola con un `SaveChangesInterceptor` que inserta el correo "ganador" justo antes del `SaveChangesAsync` bajo prueba. El proveedor **EF Core InMemory no aplica índices únicos que no sean la clave primaria** (confirmado con un test descartable: dos `DbContext` separados insertando el mismo correo NO tiran `DbUpdateException`), así que el escenario no es reproducible con la infraestructura de tests actual sin sumar un proveedor relacional (p. ej. SQLite en memoria) solo para este caso. El try/catch en el código queda como manejo defensivo verificado por lectura, no por test automatizado — documentado acá para no reportarlo como cubierto cuando no lo está.

**Dependencies:** todas las tareas de la Fase 4/5 (opera sobre el mismo código).

---

## Post-cierre — Tipo "Vacaciones" + hora opcional en solicitudes (2026-09-21)

**Contexto:** dos pedidos del usuario tras usar la app: (1) "Vacaciones" ya aparecía seleccionable en el dropdown del frontend pero tiraba error al enviar — faltaba en 3 de los 4 lugares donde vive un tipo de solicitud; (2) poder cargar una hora de inicio/fin opcional al crear una solicitud, visible (solo lectura) al revisarla.

**Cambios:**
1. `RequestType` — agregado `Vacaciones` al enum (`Enums.cs`), al `CHECK` constraint `CK_LeaveRequests_Tipo` (`AppDbContext.cs`) y a `docs/openapi.yaml`. No necesitó caso especial en `RequestTypeJsonConverter` (a diferencia de `PermisoPersonal`) porque no tiene espacio en el valor real.
2. `LeaveRequest.HoraInicio`/`HoraFin` — nuevas columnas `TimeOnly?` (SQL `time`, nullable). Opcionales: sin ellas, la solicitud sigue siendo de día completo como antes.
3. Nuevo `TimeOnlyJsonConverter` (`Enums.cs`) — el converter de `TimeOnly` que trae `System.Text.Json` por defecto solo acepta `"HH:mm:ss"` completo; un `<input type="time">` de HTML manda `"HH:mm"` (sin segundos), que el converter default rechaza con 400. Confirmado el problema con un test descartable (`JsonSerializer.Deserialize<TimeOnly>("\"14:00\"")` tira `JsonException`) antes de escribir el converter propio, que usa `TimeOnly.TryParse` (más permisivo) y siempre escribe en formato `"HH:mm"`.
4. Validación en `RequestsService.CreateAsync`: `HoraInicio`/`HoraFin` van juntas o ninguna (400 si solo viene una); si ambas vienen y `FechaInicio == FechaFin`, `HoraFin` debe ser estrictamente posterior a `HoraInicio` (400 si no). Sin chequeo de horas cuando el rango cruza varios días (`HoraInicio`/`HoraFin` describen el primer y último día, no son los extremos de un único intervalo).
5. `CreateLeaveRequestRequest`/`LeaveRequestResponse` — `HoraInicio`/`HoraFin` agregados (nullable, no `[Required]`).

**Frontend:** `Vacaciones` agregado al `TIPOS` del schema zod (`useCreateRequestForm.ts` — el dropdown ya lo tenía, pero el schema lo rechazaba y por eso "tiraba error"); dos `<input type="time">` opcionales en `CreateRequestModal.tsx`, con las mismas dos reglas de validación replicadas en zod y en el mock adapter (paridad mock/backend); ambas tablas de solicitudes (`admin/RequestsTable.tsx`, `employee/RequestsTable.tsx`) muestran la hora debajo de la fecha cuando está presente, sin editor — el admin la ve, no la cambia.

**Migración:** `AddVacacionesTypeAndRequestHora` — agrega `HoraInicio`/`HoraFin` (`time`, nullable) y recrea `CK_LeaveRequests_Tipo` con `Vacaciones` incluido. Generada y aplicada contra SQL Server real.

**Verification:** backend `dotnet build` (0/0) + `dotnet test` 77/77 (72 existentes + 5 nuevos en `RequestsServiceTests`: Vacaciones crea bien, hora válida se guarda, solo-hora-inicio → 400, hora-fin ≤ hora-inicio mismo día → 400, rango multi-día no compara horas entre sí). Frontend `tsc --noEmit` limpio, ESLint limpio, `jest` 199/199 (195 existentes + 4 nuevos en `CreateRequestModal.test.tsx`). Verificación manual end-to-end contra el backend real corriendo (no solo InMemory): login real, `POST /requests` con `Vacaciones` sin hora → 201; con `horaInicio`/`horaFin` en formato `"14:00"` (el que manda un `<input type="time">`) → 201 con esos mismos valores de vuelta; solo `horaInicio` → 400 con el mensaje esperado; `horaFin` ≤ `horaInicio` mismo día → 400 con el mensaje esperado. Quedaron 2 solicitudes `Pendiente` de esta prueba manual en la base de desarrollo (no hay endpoint de borrado de solicitudes) — el admin puede aprobarlas/denegarlas normalmente o ignorarlas.

**Dependencies:** Fase 5 (módulo `requests`).

---

## Post-cierre — Envío real de correo con Resend (2026-09-21)

**Contexto:** `IEmailSender` solo tenía el stub `LoggingEmailSender` (loguea, no envía nada de verdad — ver Tarea 8). El usuario pidió que "olvidé mi contraseña" y "reenviar contraseña" (admin) funcionaran de verdad, usando Resend (resend.com) como proveedor.

**Cambios:**
1. `Services/ResendEmailSender.cs` (nuevo) — `IEmailSender` real vía la API HTTP de Resend (`POST https://api.resend.com/emails`, `Authorization: Bearer <ApiKey>`). Si Resend rechaza el envío, solo loguea (destinatario + status, nunca el cuerpo — tiene el token) y no relanza: un correo que no salió no debe tumbar el flujo de negocio (el usuario puede reintentar "olvidé mi contraseña").
2. `Program.cs` — `LoggingEmailSender` reemplazado por `ResendEmailSender` como implementación real de `IEmailSender` (vía `AddHttpClient<IEmailSender, ResendEmailSender>`), con guard de arranque igual al de `ConnectionStrings`/`Jwt:SigningKey`: si falta `Resend:ApiKey` o `Resend:FromAddress`, la app no arranca. `LoggingEmailSender.cs` queda en el código (no se borra, sigue teniendo su test propio) pero ya no se registra en DI.
3. `appsettings.json`/`appsettings.Development.json` — sección `Resend` nueva. En Development: `FromAddress` precargado con el sandbox de Resend (`onboarding@resend.dev`, sin verificar dominio); `ApiKey` la completó el usuario directamente en el archivo (gitignoreado, nunca pasó por el chat).
4. Tests de integración (`CustomWebApplicationFactory.cs`) — el nuevo guard de arranque necesitó `UseSetting("Resend:ApiKey", ...)` / `UseSetting("Resend:FromAddress", ...)`, mismo motivo que `ConnectionStrings:DefaultConnection` (se lee sincrónicamente antes de `Build()`, `ConfigureAppConfiguration` no alcanza a tiempo). Se agregó también un `NoopEmailSender` registrado en `ConfigureServices` para que la suite nunca dependa de la red real.

**Nota de seguridad durante la verificación manual:** al probar `forgot-password` contra un correo semilla (`ana.martinez@devtch.com`), Resend lo rechazó con 403 — y el mensaje de error de Resend **incluyó en texto plano el correo verificado de la cuenta** (`apereira@devtch.com`), algo que el usuario había dicho explícitamente que no quería compartir por chat un momento antes. Se le avisó de inmediato (no se usó el dato sin decir nada) y se pidió confirmación explícita antes de seguir — el usuario confirmó que estaba bien usarlo, ya expuesto por la propia respuesta de Resend y no por algo buscado.

**Verification:** backend `dotnet build` (0/0) + `dotnet test` 77/77 (sin tests nuevos — es integración con un servicio externo, no lógica de negocio nueva; cubierto por el `NoopEmailSender` en la suite de integración). Verificación manual real contra Resend (no solo el 403 de sandbox): con `Resend:ApiKey` real configurada, (1) `POST /users` con `correo=apereira@devtch.com` → 201 y Resend respondió 200 (correo de invitación real enviado); (2) `POST /auth/forgot-password` con esa misma cuenta → 200 y Resend 200; (3) `POST /users/{id}/reset-password` (admin) → 200 y Resend 200. Los tres flujos que el usuario pidió ("olvidé mi contraseña", "reenviar contraseña" del admin, y de yapa la invitación al crear usuario, que comparte el mismo mecanismo) confirmados con entrega real, no solo con el stub de logging.

**Dato pendiente de decisión del usuario:** quedó creado en la base de desarrollo un usuario real, "Alejandro Pereira (prueba Resend)" (`apereira@devtch.com`, rol Empleado, estado Pendiente por el flujo de invitación). No hay endpoint de borrado de usuarios (solo `toggle-status`/edición) — el usuario decide si lo conserva, lo edita o lo desactiva.

**Dependencies:** Task 8 (`IEmailSender` + stub), Task 12 (mecanismo de reset), Task 16 (`reset-password` de admin).

---

## Post-cierre — Contraseña temporal en vez de token de un solo uso (2026-09-21)

**Contexto:** pedido explícito del usuario — "En lugar de enviar un token, sería de enviar una contraseña temporal". Reemplaza el mecanismo de `PasswordResetToken` + `POST /auth/set-password` (el usuario recibía un token y elegía su propia contraseña en `/set-password`) en los **tres** flujos que lo compartían (invitación de usuario nuevo, "olvidé mi contraseña", "reenviar contraseña" de admin) por: el backend genera una contraseña temporal, la escribe directo como la contraseña real del usuario, y la manda por correo. Confirmado con el usuario que la contraseña temporal **obliga a cambiarla en el primer login** (recomendado, dado que viajó en texto plano por correo) y que el mecanismo de token viejo se **elimina del todo** (no queda como código muerto).

**Cambios — backend:**
1. `User.MustChangePassword` (bool, nuevo) — se prende al emitir una temporal, se apaga en `ChangePasswordAsync` al elegir una propia.
2. `PasswordResetService.IssueTemporaryPasswordAsync(correo)` (reemplaza `RequestResetAsync` + `SetPasswordAsync`) — genera una temporal de 12 caracteres que ya cumple `PasswordRules` (Fisher-Yates sobre 4 categorías garantizadas + relleno al azar), la hashea como `PasswordHash`, pone `Estado = Activo` (ya puede loguearse, sin paso intermedio) y `MustChangePassword = true`, rota el `SecurityStamp`, y la manda por correo. Mismo criterio de "nunca revelar si el correo existe o está Desactivado" que antes.
3. Entidad `PasswordResetToken` eliminada del todo (archivo, `DbSet`, config de `AppDbContext`, índice). `SetPasswordRequest` (DTO) eliminado. `POST /auth/set-password` eliminado de `AuthController`.
4. `UsersService.ResetPasswordAsync` simplificado: ya no pasa por un estado intermedio `Pendiente`/`PasswordHash = null` — delega entero a `IssueTemporaryPasswordAsync` (el botón de esto en el admin ya solo se muestra para usuarios `Activo`, así que nunca depende de la rama "no-op" para `Desactivado`).
5. **Enforcement real, no solo de UI**: nuevo middleware en `Program.cs` (después de `UseAuthentication`, antes de `UseAuthorization`) que, si el claim `must_change_password` del JWT es `true`, solo deja pasar `POST /auth/change-password`, `POST /auth/logout` y `GET /auth/session` — cualquier otro endpoint de `/api` responde 403. Sin esto, "forzar el cambio" hubiera sido solo cosmético del lado del frontend (cualquiera podría haber seguido usando la temporal llamando a la API directo).
6. Bug propio encontrado y corregido antes de que llegara a producción: `bool.ToString()` en C# da `"True"`/`"False"` (mayúscula), pero el primer borrador del middleware comparaba contra `"true"` en minúscula — nunca hubiera matcheado. Corregido con `bool.TryParse` en vez de comparación de string.
7. `JwtTokenService.GenerateToken`/`SessionResponse` — nuevo parámetro/campo `mustChangePassword`, propagado en los 3 call-sites de `AuthController` (`Login`, `GetSession`, `ChangePassword` — este último para que el token se reemita ya sin el flag apenas el usuario termina de cambiarla).
8. Migración `ReplacePasswordResetTokenWithMustChangePassword` — dropea `PasswordResetTokens`, agrega `Users.MustChangePassword` (`bit NOT NULL DEFAULT 0`). Generada y aplicada contra SQL Server real.
9. `docs/openapi.yaml`/`docs/er-diagram.md` actualizados (schema `Session` con `mustChangePassword`, `/auth/set-password` eliminado, notas del ER sin `PasswordResetTokens`).

**Cambios — frontend:**
1. Eliminados del todo: `pages/set-password.tsx`, `components/pages/set-password/` (form, hook, tests), `SetPasswordPayload`, `auth.api.ts#setPassword`, `auth.http-adapter.ts#setPassword`, `mockAuthAdapter.setPassword`.
2. `Session.mustChangePassword` (nuevo campo, requerido) — viaja en cada login/refresh de sesión.
3. `ChangePasswordModal` — nueva prop `forced`: sin botón "Cancelar", sin cierre por Escape (reusa el `closeDisabled` de `useModalAlly`), con un mensaje explicando por qué. Sigue siendo el mismo componente que ya usaba el menú de usuario para el cambio voluntario — no se creó una página nueva de formulario, solo un modo del existente.
4. Página nueva `pages/change-password-required.tsx` — renderiza `ChangePasswordModal` en modo `forced`; su `getServerSideProps` redirige de vuelta al home normal si alguien llega ahí sin tener pendiente el cambio (URL escrita a mano).
5. `middlewares/with-auth.tsx` — único punto central (no hay layout global de páginas autenticadas en este proyecto, confirmado antes de tocar nada) que redirige a `/change-password-required` cuando `session.mustChangePassword` es `true`, salvo en esa misma página (evita loop).
6. Mock adapter: `forgotPassword`/`mockUsersAdapter.resetPassword` ahora simulan el mismo efecto que el backend real (`Activo` + `mustChangePassword: true`) en vez de `Pendiente`, para paridad mock/backend.

**Verification:**
- Backend: `dotnet build` (0/0) + `dotnet test` **77/77** — incluye 5 tests nuevos de `PasswordResetServiceTests` (temporal cumple las reglas propias en 20 corridas al azar, rota el `SecurityStamp`, correo inexistente/Desactivado no hace nada ni envía nada) y **1 test de integración HTTP real** nuevo en `AuthorizationAndRevocationTests.cs` que prueba el pipeline completo: login con la temporal → un endpoint de negocio cualquiera da 403 → `/auth/session` sigue permitido → `POST /auth/change-password` da 200 y reemite el token → el mismo endpoint que antes daba 403 ahora da 200.
- Frontend: `tsc --noEmit` limpio, ESLint limpio (0 errores), `jest` **202/202** (191 existentes ajustados + 11 nuevos: `ChangePasswordModal` en modo forzado, `change-password-required`'s `getServerSideProps`, el gate de `with-auth.tsx`).
- **Verificación manual real, sin acceso al correo del usuario** (no se puede leer la contraseña temporal real sin acceso a la bandeja): se verificó contra SQL Server real que `POST /auth/forgot-password` deja al usuario `Activo`/`MustChangePassword=1`/con un hash nuevo, y que Resend acepta el envío (200) — la prueba de login-con-la-temporal-y-desbloqueo se cubrió con el test de integración HTTP real de arriba en vez de con un curl manual, precisamente porque el diseño no permite que nadie más que el dueño del correo vea la temporal (ni siquiera el propio desarrollador leyendo logs, a propósito).
- **Nota de seguridad ocurrida durante la verificación**: al probar `forgot-password` contra un correo de prueba, la respuesta de error de Resend expuso en texto plano el correo real verificado de la cuenta del usuario — se le avisó de inmediato antes de usarlo para nada, y se pidió confirmación explícita, que el usuario dio.
- **Pendiente de que el usuario confirme en el navegador** (no pude hacerlo yo mismo sin el valor real de la temporal): que el login con la temporal efectivamente redirige a `/change-password-required` y que, tras cambiarla, cae en su home normal.

**Dependencies:** Post-cierre "Envío real de correo con Resend" (arriba) — usa el mismo `IEmailSender`.

---

## Spec pendiente — Módulo de Gestión de PTO (Paid Time Off) (2026-09-21)

**Estado: solo especificación, todavía sin implementar. No tocar código hasta indicación explícita del usuario.**

### Requerimiento original del usuario

> Implementar un módulo de autogestión de tiempo libre remunerado (PTO) que permita a los colaboradores consultar su saldo acumulado y solicitar horas o días libres a través de una interfaz interactiva de calendario, automatizando el devengo quincenal de horas y el reinicio de balance anual.
>
> - Devengo/Acumulación: cada colaborador acumula 5 horas de PTO por quincena.
> - Vigencia y Expiración: las horas son acumulables únicamente durante el año en curso. Al cierre del año (31 de diciembre) el balance no disfrutado expira; el 1 de enero se reinicia a 0 (política "use it or lose it").
> - Consumo: el usuario solo puede solicitar PTO si cuenta con balance suficiente disponible.
> - Vista de calendario: visualización mensual del calendario laboral + balance actual. Al seleccionar una fecha específica se despliega un modal con dos opciones: "Jornada completa" (8h) o "Tiempo personalizado" (horas a definir).
> - Confirmación y descuento: al confirmar, las horas se descuentan del balance y la fecha queda marcada en el calendario.

### Decisiones confirmadas con el usuario (todas por `AskUserQuestion` o respuesta directa, ninguna asumida sin confirmar)

1. **Autoservicio inmediato, sin aprobación de admin.** Al confirmar en el modal, la solicitud queda `Aprobada` al instante y el balance se descuenta en el momento — no pasa por `Pendiente` ni por revisión de un admin. Motivo: el requerimiento dice "al confirmar la solicitud... se descuentan", no "al aprobar".
2. **Reutiliza `LeaveRequests`, no se crean tablas nuevas de PTO.** El `Tipo = Vacaciones`, que ya existe en el enum, es la solicitud de PTO. Sin ledger, sin tabla de balance propia.
3. **Balance calculado on-the-fly, sin jobs/cron.** El devengo quincenal y el reinicio anual salen de una fórmula evaluada en cada consulta (ver abajo) — no hay infraestructura de scheduler en el proyecto y no hace falta agregarla.
4. **Vacaciones deja de vivir en el flujo genérico de solicitudes.** No es un tipo más del formulario genérico (`POST /requests`, `CreateRequestModal` del frontend). Motivo explícito del usuario: los demás tipos (Emergencia, Enfermedad, Permiso personal, Otro) piden hora obligatoria; Vacaciones no pide hora en absoluto — solo la fecha y que el balance acumulado alcance. Son estructuralmente distintos, no dos caminos inconsistentes para lo mismo.
5. **`Users.FechaIngreso` lo carga el admin al dar de alta al empleado.** Es el punto de partida del devengo de esa persona.
6. **El contador de devengo se detiene de inmediato al desactivar al empleado.** Necesita un campo propio (`FechaDesactivacion`) para congelar el cálculo con precisión — `UpdatedAt` no sirve porque lo tocan otras operaciones sin relación (ej. cambio de contraseña).
7. **Selección en el calendario: un día a la vez.** El empleado hace click en una fecha específica, confirma, y si quiere reservar otro día repite la acción — no hay selector de rango de fechas en una sola solicitud (coincide con la letra del requerimiento: "al seleccionar una fecha específica").
8. **Cancelación: irreversible en esta versión.** No hay endpoint para liberar un día ya confirmado. El consumo parcial del balance (tomar 7 de 15 horas/días acumulados, dejar el resto para después) ya sale gratis del modelo — cada solicitud descuenta solo lo que pide.
9. **El admin necesita visibilidad de las vacaciones del equipo, en una vista separada** de `/admin/requests` (no mezclada con el flujo de aprobación, porque acá no hay nada que aprobar) — para planificación.
10. **Quincena = corte estándar**: día 15 y último día de cada mes.

### Modelo de datos (campos nuevos, sin tablas nuevas)

**`Users`** — 2 campos nuevos:
- `FechaIngreso: DateOnly` — obligatorio, lo carga el admin al crear el usuario (`CreateUserRequest` gana este campo).
- `FechaDesactivacion: DateOnly?` — se completa solo al ejecutar `toggle-status` hacia `Desactivado`; se limpia si se reactiva.

**`LeaveRequests`** — 1 campo nuevo:
- `HorasSolicitadas: decimal` — para `Tipo = Vacaciones`: 8 (jornada completa) o el valor personalizado que eligió el empleado. Para el resto de los tipos no aplica (no se toca su comportamiento actual). `HoraInicio`/`HoraFin` (agregados en el post-cierre anterior) quedan siempre `null` en las solicitudes de Vacaciones — no se usan para este flujo.

### Regla de cálculo de balance (sin persistencia propia, evaluada en cada consulta)

```
inicioDevengo   = max(FechaIngreso, 1-enero-del-año-en-curso)
finDevengo      = min(hoy, FechaDesactivacion ?? hoy)
quincenas       = cortes de quincena (día 15 / último día de mes) ya pasados entre inicioDevengo y finDevengo
horasAcumuladas = quincenas × 5
horasConsumidas = SUM(HorasSolicitadas) de LeaveRequests
                   WHERE Tipo = Vacaciones AND Estado = Aprobada
                   AND FechaInicio dentro del año en curso
balanceDisponible = horasAcumuladas − horasConsumidas
```

El reinicio anual ("use it or lose it") no necesita borrar ni resetear nada: el filtro "dentro del año en curso" en `horasConsumidas` y el `max(..., 1-enero)` en `inicioDevengo` ya implementan que el saldo no usado de un año deja de contar apenas cambia el año.

### Componentes de backend a construir

- `CreateUserRequest` gana `FechaIngreso` (obligatorio).
- `UsersService.ToggleStatusAsync` escribe/limpia `FechaDesactivacion` según el sentido del toggle.
- `IPtoBalanceService.CalcularBalance(employeeId)` — implementa la fórmula de arriba.
- Endpoint nuevo, separado del flujo genérico de `requests`: `POST /pto/requests` — recibe `fecha` + `horas` (8 fijo o personalizado), valida contra el balance disponible (rechaza si no alcanza, 409 o 400 a definir en implementación), crea la `LeaveRequest` con `Tipo=Vacaciones`, `Estado=Aprobada` directo, `ReviewedBy`/`ReviewedAt` a definir (posible: null, ya que nadie revisó), dispara correo de confirmación (mismo `IEmailSender`/Resend ya integrado).
- `GET /pto/balance` — balance del usuario autenticado.
- `GET /pto/calendario` (o nombre similar) — listado de solo lectura para admin, de las vacaciones reservadas por todo el equipo (reutiliza el filtro por nombre de empleado ya construido en el frontend).
- Migración EF: `FechaIngreso`, `FechaDesactivacion`, `HorasSolicitadas`.
- Tests unitarios de `IPtoBalanceService`: ingreso a mitad de año, cambio de año (balance consumido el año pasado no debe descontar del año nuevo), empleado desactivado a mitad de período (el contador no debe seguir sumando después de `FechaDesactivacion`), balance insuficiente al crear una solicitud.
- Tests de integración HTTP de punta a punta del nuevo endpoint de creación.

### Fuera de alcance (v1)

- Cancelar/liberar un día de PTO ya confirmado.
- Selección de rango de fechas en una sola solicitud.
- Cualquier job/cron — todo se calcula al vuelo.

### Fases propuestas

1. Backend: migraciones + `IPtoBalanceService` con tests unitarios de los casos borde.
2. Backend: endpoint de creación autoservicio + endpoint de balance + endpoint de calendario de admin, con tests de integración.
3. Frontend: calendario + modal + widget de balance sobre mocks (paridad con backend), ajuste de `CreateRequestModal` (retirar `Vacaciones` del dropdown genérico) y del formulario de alta de usuario (`FechaIngreso`).
4. Frontend: integración real contra la API + vista de admin.
5. Verificación end-to-end + actualización de `openapi.yaml`/`er-diagram.md`/`todo.md`.

**Dependencies:** Fase 4 (`users`) y Fase 5 (`requests`) ya cerradas; Post-cierre "Contraseña temporal" (arriba), sin relación directa pero es el estado actual del código sobre el que se construiría esto.

---

## Post-cierre — Módulo PTO, Fases 1-5 completas (2026-09-21)

**Fases 1-2 (backend)** implementadas en modo guiado (código compartido, aplicado por el usuario, revisado por Claude — con 2 excepciones puntuales a pedido explícito: la migración y el archivo de tests, que Claude aplicó directo) y verificadas: `dotnet build` 0/0, `dotnet test` **99/99** (91 de Fase 1 + 8 de `PtoRequestsServiceTests` de Fase 2). Migración `AddPtoFieldsToUsersAndRequests` aplicada contra SQL Server real (`Users.FechaIngreso`/`FechaDesactivacion`, `LeaveRequests.HorasSolicitadas`).

**Bug encontrado y corregido durante la aplicación (Fase 1):** `IPtoRequestsService.cs`/`PtoRequestsService.cs`/`PtoRequestsServiceTests.cs` quedaron guardados en `Models/Dtos/Pto/` en vez de `Services/Pto/`/`tests/OwnSpaceAPI.Tests/Pto/` — mismo tipo de error de ubicación que ya había pasado con `IPasswordResetService.cs` (Tareas 12/15). El de `PtoRequestsServiceTests.cs` rompía la compilación de verdad (quedó dentro del proyecto `OwnSpaceAPI.Api`, que no referencia xUnit). Movidos a su lugar.

**Bug propio encontrado y corregido en los tests (Fase 2):** un test de "supera el balance" reutilizaba el empleado con mucho balance acumulado (ingreso en 2020) y pedía `balance + 1` horas — ese número siempre superaba el tope de 8h/día, así que el test disparaba `BadRequestException` en vez de `ConflictException`, sin aislar los dos chequeos. Corregido con un empleado de `FechaIngreso` en el futuro (balance 0 garantizado) pidiendo 1h.

**Fase 4 (verificación manual end-to-end contra el backend real, no InMemory):** con `ana.martinez@devtch.com`/`Empleado123!` — `GET /pto/balance` devolvió `85.00`, coincidiendo exacto con el cálculo a mano a partir de su `FechaIngreso` real en SQL Server (2026-01-01); `POST /pto/requests` (jornada completa, hoy) → `201`, `Aprobada`, `HorasSolicitadas=8.00`, confirmado también leyendo la fila directo de la base; `GET /pto/balance` after → `77.00` (descuento real); segunda reserva misma fecha → `409` real; 10 horas → `400` real. Con `julio.perez@devtch.com`/`Admin123!`, `GET /pto/calendario` trajo la reserva de Ana — y de paso mostró en vivo el gap de abajo (una `Vacaciones` vieja creada por el flujo genérico también aparece ahí, prueba de que el hueco es explotable de verdad, no solo teórico).

**Fase 5 (docs):** `docs/openapi.yaml` — tag `pto` nuevo, 3 paths (`/pto/balance`, `/pto/requests`, `/pto/calendario`), schemas `PtoBalance`/`CreatePtoRequestRequest`, `fechaIngreso` agregado a `User`/`CreateUserRequest`, `horasSolicitadas` agregado a `LeaveRequest`. Validado con `js-yaml` (parsea sin error, 16 paths/16 schemas) y un chequeo de que todos los `$ref` resuelven contra un schema/parameter real. `docs/er-diagram.md` — `FechaIngreso`/`FechaDesactivacion` en `Users`, `HorasSolicitadas` en `LeaveRequests`, dos notas de diseño nuevas (balance sin tabla/ledger, PTO autoservicio sin aprobación). De paso se corrigió una referencia muerta a "el token de `PasswordResetTokens`" que había quedado en la nota de `Id` como GUID, desde el batch de "contraseña temporal" que eliminó esa tabla.

**Gap conocido, todavía sin cerrar:** `RequestsService.CreateAsync` (`POST /requests`, el endpoint genérico) sigue aceptando `Tipo=Vacaciones` sin ningún chequeo de balance — confirmado explotable en la verificación manual de arriba. Pendiente: agregar un guard (400 si `Tipo=Vacaciones` en el endpoint genérico) — no se tocó en este batch a pedido del usuario, queda para una próxima vuelta.

**Dependencies:** Fase 1-2 de este mismo módulo (arriba).

---

## Post-cierre — Gap de Vacaciones en el endpoint genérico, cerrado (2026-09-21)

A pedido explícito del usuario ("Puedes cerrarlo"), Claude implementó directo.

**Cambio:** `RequestsService.CreateAsync` (`POST /requests`) ahora rechaza `Tipo=Vacaciones` con `BadRequestException` (400) — ese tipo tiene su propio flujo de autoservicio (`POST /pto/requests`) con su propio chequeo de balance; dejarlo pasar por acá permitía crear una `Vacaciones` `Pendiente` esquivando esa validación por completo (confirmado explotable en la verificación manual de la Fase 4).

**Paridad en el mock del frontend:** `mockRequestsAdapter.create` ganó el mismo guard, mismo mensaje de error, siguiendo el criterio ya establecido de que el mock replica las reglas de negocio reales del backend.

**`docs/openapi.yaml`:** `CreateLeaveRequestRequest.tipo` ahora excluye `Vacaciones` de su enum (mismo patrón que `CreateUserRequest.rol` excluye `SuperAdmin`), y la descripción del 400 de `POST /requests` menciona el nuevo motivo de rechazo.

**Tests actualizados:**
- Backend: `CreateAsync_ConVacaciones_CreaLaSolicitudPendiente` reescrito a `CreateAsync_ConVacaciones_TiraBadRequest` (ahora afirma el rechazo). `CreateAsync_ConHoraEnUnRangoDeVariosDias_NoComparaHorasEntreDiasDistintos` cambió su `Tipo` de prueba de `Vacaciones` a `Otro` (solo usaba Vacaciones como tipo de conveniencia, sin relación con lo que en verdad prueba).
- Frontend: test nuevo en `mock-adapter.test.ts` confirmando el rechazo con el mismo mensaje.

**Verification:**
- Backend: `dotnet build` 0/0, `dotnet test` **99/99** (mismo total — un test cambió de propósito, no se sumó cantidad neta).
- Frontend: `tsc` limpio, `npm test` **228/228** (227 + 1 nuevo).
- `openapi.yaml` re-validado con `js-yaml` (16/16, sin `$ref` rotas).
- **Verificación manual contra el backend real** (no solo tests): `POST /requests` con `Tipo=Vacaciones` → `400` real con el mensaje esperado; `Tipo=Otro` en el mismo endpoint → `201` normal, confirmando que el resto del flujo genérico sigue intacto.

Con esto, el módulo de PTO queda cerrado sin cabos sueltos conocidos.

**Dependencies:** Post-cierre "Módulo PTO, Fases 1-5 completas" (arriba).

---

## Post-cierre — Eliminación del rol SuperAdmin (2026-09-22)

A pedido explícito del usuario: la pregunta abierta desde el inicio del proyecto sobre qué distinguiría a `SuperAdmin` de `Administrador` se resolvió no con una definición de permisos, sino con la decisión de **eliminar el rol por completo** ("No necesitamos un superadmin para esto, se elimina por completo"). Implementado por Claude directo (modo ágil, a pedido explícito).

**Cambios:**
- `UserRole` (enum, `Models/Entities/Enums.cs`): sacado el valor `SuperAdmin`. Solo quedan `Empleado`/`Administrador`.
- `UsersService`: eliminados los guards que ya no pueden dispararse al no existir el valor de enum — el chequeo `rol == UserRole.SuperAdmin` en `CreateAsync`/`UpdateAsync`, y el helper `EnsureNotSuperAdmin` (y sus tres llamadas en `UpdateAsync`/`ResetPasswordAsync`/`ToggleStatusAsync`).
- `AppDbContext`: `CK_Users_Rol` actualizado a `[Rol] IN ('Empleado', 'Administrador')`.
- Migración nueva `RemoveSuperAdminRole` (drop + recreate del CHECK constraint) — aplicada contra la base de desarrollo real sin incidentes (no había ninguna fila con `Rol='SuperAdmin'` sembrada).
- `docs/openapi.yaml`: `UserRole` schema pasa a `enum: [Empleado, Administrador]`; los overrides `allOf`+`enum` en `CreateUserRequest.rol`/`UpdateUserRequest.rol` (que existían solo para excluir `SuperAdmin` del `$ref` de 3 valores) ya no hacen falta y se simplificaron a `$ref` directo.
- `docs/er-diagram.md`: nota del CHECK de `Rol` actualizada.
- `SPEC.md` (frontend y backend) y `OwnSpace.md`: referencias a SuperAdmin como "fuera de alcance/sin definir" corregidas a "evaluado y descartado, no se implementa".
- No hizo falta tocar el frontend — nunca tuvo ninguna referencia a `SuperAdmin` (ni rutas, ni tipos, ni UI), confirmado por búsqueda antes de empezar.

**Tests eliminados** (ya no compilan al no existir el valor de enum, y ya no hay comportamiento que probar): `CreateAsync_ConRolSuperAdmin_TiraBadRequest`, `UpdateAsync_ConRolSuperAdmin_TiraBadRequest`.

**Verification:** `dotnet build` 0/0, `dotnet test` **97/97** (99 − 2 tests eliminados). `dotnet ef database update` aplicó la migración limpio contra SQL Server real.

**Dependencies:** ninguna — cierre de un ítem de scope abierto desde el inicio del proyecto (ver `OwnSpace.md`, `SPEC.md` §8 original).

---

## Post-cierre — Permitir desactivar un usuario Pendiente (2026-09-22)

A pedido explícito del usuario, tras encontrar (probando manualmente) que `ToggleStatusAsync` rechazaba con 409 cualquier intento de desactivar un usuario `Pendiente`. Alcance acordado con el usuario antes de implementar (ver preguntas de la sesión): no tocar los flujos de creación/reset — siguen yendo directo a `Activo` — solo habilitar el toggle sobre `Pendiente`, y decidir a qué estado vuelve al reactivar según si esa cuenta alguna vez tuvo una contraseña real.

**Cambio en `UsersService.ToggleStatusAsync`:**
- `Pendiente` y `Activo` ahora van hacia `Desactivado` por igual (antes solo `Activo` podía). El guard de "no dejar sin admins" (`EnsureNotLastActiveAdminAsync`) se llama en ambos casos — es no-op para `Pendiente` porque nunca es `Activo`, así que es seguro invocarlo sin distinguir.
- Reactivar (`Desactivado` → ?) ahora depende de `PasswordHash`: si es `null` (la cuenta nunca pasó por `CreateAsync`/`IssueTemporaryPasswordAsync` con una contraseña real asignada — llegó a `Desactivado` directo desde `Pendiente`), vuelve a `Pendiente` en vez de `Activo`, porque no tiene con qué loguearse. Un admin tendría que usar "Resetear contraseña" aparte para mandarle una temporal.

**Tests backend:** `CrearUsuario` (helper de test) ganó un parámetro `passwordHash` con default no-null (la mayoría de los fixtures representa cuentas que ya tienen contraseña real) — solo los tests del nuevo camino pasan `passwordHash: null` explícito. `ToggleStatusAsync_ConUsuarioPendiente_TiraConflict` reescrito a `...LoDejaDesactivado`. Test nuevo `ToggleStatusAsync_AlReactivarUnoSinContraseñaReal_VuelveAPendiente`.

**Paridad en el mock del frontend:** el `User` (contrato) ganó `contrasenaAsignada?: boolean` — mock-only, equivalente a "`PasswordHash` no es null" del backend real. Los fixtures no-Pendiente (`mock-data.ts`) lo tienen en `true`; Sofía Núñez (Pendiente) lo deja sin setear a propósito. `mockUsersAdapter.toggleStatus` replica la misma lógica; `resetPassword`/`forgotPassword` ahora también lo setean en `true` (consistente con que esos flujos sí emiten una contraseña real).

**Verificación manual contra el backend real** (no solo tests): usando un usuario `Pendiente` real que ya estaba en la base de desarrollo (`hold@devtch.com`, id `5048c7bc-a25e-4a27-a289-cbb34b4d6639`) — `POST /users/{id}/toggle-status` → `200`, `Desactivado` (antes daba 409); segundo toggle → `200`, vuelve a `Pendiente` (confirma que el `PasswordHash` null de esa cuenta legacy hace exactamente lo esperado).

**Verification:** backend `dotnet build` 0/0, `dotnet test` **98/98** (97 − 1 reescrito + 2 nuevos netos). Frontend `tsc` limpio, lint 0 errores, `npm test` **243/243**, `npm run build` exitoso (dev server detenido antes en ambos repos).

**Dependencies:** ninguna — hallazgo de QA manual sobre el batch anterior de SuperAdmin/filtros.

---

## Post-cierre — Escalabilidad, Fase 1: índices en LeaveRequests (2026-09-22)

A partir de una pregunta del usuario ("¿si la cantidad de solicitudes y usuarios se incrementan, se puede desbordar o perder rendimiento?"), auditoría de escalabilidad (agente `Explore`, sin tocar código) y plan de 3 fases acordado con el usuario: 1) índices, 2) nombre del empleado en la respuesta de solicitudes, 3) paginación real de `/requests` con filtros server-side. Modo **guiado** (a pedido explícito del usuario para este batch).

**Hallazgo corregido durante la auditoría:** `EmployeeId` y `ReviewedBy` en `LeaveRequests` YA tenían índice (EF Core los crea automático por ser Foreign Key, desde la migración inicial) — el hallazgo real no era "sin índices", sino que faltaba cubrir `Estado` y la combinación con `CreatedAt` (por el que siempre se ordena).

**Cambio:** `AppDbContext.cs` — dos índices compuestos nuevos en `LeaveRequest`:
- `(EmployeeId, CreatedAt)` — cubre `ListMineAsync` (filtra por `EmployeeId`, ordena por `CreatedAt`) sin un sort aparte.
- `(Estado, CreatedAt)` — cubre `ListPendingAsync`/`ListAllAsync(estado?)`.

Migración `AddLeaveRequestsIndexes`: EF Core reemplazó el índice simple de `EmployeeId` por el compuesto en vez de dejar ambos duplicados (`ReviewedBy` no se tocó). Aplicada contra la base de desarrollo real sin incidentes.

**No se tocó `Users` en esta fase** — hoy `ListAsync` no tiene ningún filtro que se beneficie de un índice nuevo; eso se resuelve con la paginación de Usuarios, que queda para una vuelta futura (no forma parte de este plan de 3 fases, que se centró en Solicitudes).

**Verification:** `dotnet build` 0/0, `dotnet test` 98/98 (sin cambios de comportamiento, solo índices).

**Dependencies:** ninguna. Sigue la Fase 2 (nombre del empleado en `LeaveRequestResponse`) y Fase 3 (paginación).

---

## Post-cierre — Escalabilidad, Fase 2: nombre del empleado en LeaveRequestResponse (2026-09-22)

Segunda fase del plan de escalabilidad (ver Fase 1, arriba). Objetivo: que el frontend deje de pedir la tabla `Users` completa solo para poner nombres en la tabla de solicitudes del admin — requisito para que la Fase 3 (paginación) tenga sentido (si no, cada página de solicitudes seguiría necesitando todos los usuarios para resolver nombres).

**Decisión de diseño confirmada con el usuario:** `EmployeeNombre` es nullable. `RequestsService.ReviewAsync` (Aprobar/Denegar) ya cargaba `.Include(r => r.Employee)`, pero `CreateAsync` arma la entidad solo con `EmployeeId` — no vale la pena una consulta extra en cada creación solo para completar un campo que la vista del propio empleado no necesita mostrar.

**Cambios backend:**
- `LeaveRequestResponse`: nuevo campo `EmployeeNombre` (`string?`), poblado desde `r.Employee?.Nombre` en `FromEntity`.
- `RequestsService.ListMineAsync/ListPendingAsync/ListAllAsync`: agregado `.Include(r => r.Employee)` (mismo patrón que ya usaba `ReviewAsync`).
- `docs/openapi.yaml`: campo `employeeNombre` documentado en el schema `LeaveRequest`, nullable, con la aclaración de por qué es null solo en la respuesta de `POST /requests`.

**Tests backend:** 3 tests nuevos/extendidos en `RequestsServiceTests.cs` (`ListMineAsync_IncluyeElNombreDelEmpleado`, y assertions agregadas a `ListPendingAsync_SoloDevuelveLasPendientes` / `ListAllAsync_SinFiltro_DevuelveTodas`) confirmando que `Employee.Nombre` viene cargado.

**Cambios frontend:**
- `contracts/interfaces/request.ts`: `LeaveRequest` gana `employeeNombre?: string`.
- `useAdminRequests.ts`: **eliminado** el `API.users.list()` que se pedía en cada `load()` — ahora usa `request.employeeNombre` directo (con el mismo fallback `'Empleado'` que ya tenía).
- Mock (`mock-adapter.ts`): helper nuevo `withEmployeeNombre(r)` que resuelve el nombre buscando en el array `users` en memoria (mismo criterio que el `.Include()` real) — aplicado en `listPending`/`listAll`. `listByEmployee` (la vista del propio empleado) no lo necesita, igual que el backend real no lo carga ahí.

**Verificación manual contra el backend real:** `GET /requests/pending` autenticado como admin → cada solicitud trae `employeeNombre` resuelto (ej. `"employeeNombre":"Ana Martínez"`), sin ningún fetch adicional a `/users`.

**Verification:** backend `dotnet build` 0/0, `dotnet test` **99/99** (98 + 1). `docs/openapi.yaml` re-validado con `js-yaml` (16/16 paths/schemas). Frontend `tsc` limpio, lint 0 errores, `npm test` **243/243** (sin tests nuevos del lado frontend — los existentes ya cubrían el comportamiento gracias al mock actualizado), `npm run build` exitoso.

**Dependencies:** Fase 1 (arriba). Habilita la Fase 3 (paginación real de `/requests`).

---

## Post-cierre — Escalabilidad, Fase 3: paginación real de /requests con filtros server-side (2026-09-22)

Última fase del plan de escalabilidad. Modo guiado (a pedido del usuario). Alcance confirmado con el usuario antes de empezar: solo `/admin/requests` (no "Mis solicitudes" del empleado — muchas menos filas por persona, no urgente); sobre de respuesta `{ items, totalCount, page, pageSize }` en vez de array plano.

**Cambio de contrato:** `GET /requests` y `GET /requests/pending` dejan de devolver un array — devuelven `PagedLeaveRequests` (`items`, `totalCount`, `page`, `pageSize`). `totalCount` refleja los filtros aplicados (tab/tipo/fecha/nombre), no el total sin filtrar — cambio de comportamiento respecto al contador de la pestaña de antes (que a propósito no se achicaba con el buscador de nombre; ahora sí, porque viene del mismo query paginado).

**Backend:**
- `Models/Dtos/Common/PagedResult.cs` — record genérico nuevo (`Items`, `TotalCount`, `Page`, `PageSize`), reutilizable el día que se pagine Usuarios.
- `RequestsService.ListPendingAsync`/`ListAllAsync` ganan `tipo`, `fecha`, `nombre`, `page`, `pageSize`. **El orden de cada uno se mantiene igual que antes** — Pending sigue ascendente (más vieja primero), All sigue descendente (más nueva primero) — no se unificó.
- Filtro por `nombre`: join contra `Users.Nombre` vía `EF.Functions.Like` (no `.Contains()` — bajo el proveedor InMemory que usan los tests, `.Contains()` compara con semántica ordinal case-sensitive, mientras que `Like` sí es case-insensitive en InMemory y en SQL Server real, consistente con el collation CI de la base).
- `page`/`pageSize` se acotan del lado del servidor (`page` mínimo 1, `pageSize` entre 1 y 100) — defensivo, no confía en el cliente.
- `RequestsController`: `[FromQuery] RequestType? tipo` usa el binder default de ASP.NET (no el `RequestTypeJsonConverter` del body JSON) — el query string tiene que mandar el nombre literal del enum (`PermisoPersonal`, sin espacio), no "Permiso personal". Se resolvió del lado del frontend (ver abajo), no tocando el binder.
- `docs/openapi.yaml`: nuevo schema `PagedLeaveRequests`, parámetros reutilizables (`RequestsTipoFiltro`/`RequestsFechaFiltro`/`RequestsNombreFiltro`/`Page`/`PageSize`), y de paso se documentó `GET /requests` (no tenía entrada en el spec, solo el `POST`).

**Tests backend:** 6 nuevos en `RequestsServiceTests.cs` — paginación (página 2 de 25 trae las correctas), `page`/`pageSize` fuera de rango se acotan, filtro de tipo, filtro de fecha (rango multi-día), filtro de nombre (case-insensitive), y `TotalCount` reflejando los filtros aplicados (no el total sin filtrar) — este último con `pageSize=1` a propósito para que el assert falle si `TotalCount` viniera mal.

**Frontend:**
- `contracts/interfaces/common.ts` (nuevo) — `PagedResult<T>`. `contracts/interfaces/request.ts` — `RequestsListParams` (tipo/fecha/nombre/page/pageSize).
- `requests.http-adapter.ts`: helper `tipoParaQuery` traduce "Permiso personal" (con espacio, lo que usa el resto del frontend) a "PermisoPersonal" (lo que espera el query-string binder de ASP.NET) — sin tocar nada del lado del backend.
- `useAdminRequests.ts` reescrito: paginación server-side (`page`/`setPage`/`totalPages`), debounce de 350ms en `nombreQuery` antes de disparar el fetch (antes era gratis, filtraba en memoria — ahora cada búsqueda es un request HTTP), y cambiar cualquier filtro (tab/tipo/fecha/nombre debounced) vuelve a la página 1. `approve`/`deny` ya no parchean la lista local — recargan la página actual (más simple y correcto con datos paginados; si la página queda vacía porque bajó el total, se corrige sola a la última página real).
- `components/common/Pagination.tsx` (nuevo) — números de página con ventana alrededor de la actual + primera/última con "…" cuando hay muchas; reusable para cuando se pagine Usuarios.
- `pages/admin/requests.tsx` — agrega el componente de paginación y el contador de resultados debajo de la tabla.
- Mock (`mock-adapter.ts`): `filtrarYPaginar()` replica los mismos 3 filtros + Skip/Take que el backend real, aplicado en `listPending`/`listAll`, con el mismo orden ascendente/descendente que sus contrapartes reales.

**Verificación manual contra el backend real:** `GET /requests?page=1&pageSize=3` → 3 items, `totalCount` real (21 en la base de desarrollo); `GET /requests?nombre=ana&tipo=PermisoPersonal` → filtros combinados funcionando, `employeeNombre` resuelto en cada fila.

**Verification:** backend `dotnet build` 0/0, `dotnet test` **105/105** (99 + 6). `docs/openapi.yaml` re-validado (17 schemas, 7 parameters, sin `$ref` rotas). Frontend `tsc` limpio, lint 0 errores, `npm test` **253/253** (243 + 10 nuevos: 6 de `Pagination`, 2 de `mock-adapter`, 2 de `useAdminRequests`), `npm run build` exitoso.

Con esto se cierra el plan de escalabilidad de 3 fases (índices → nombre en la respuesta → paginación).

**Dependencies:** Fase 1 y Fase 2 (arriba).

---

## Post-cierre — Auditoría de seguridad: 1 Alto + 4 Medios cerrados (2026-09-22)

A pedido del usuario ("realiza nuevamente el test que se hizo en el proyecto anteriormente"), se corrió un audit de seguridad completo (agente `security-auditor`) sobre frontend + backend, categorizado en Crítico/Alto/Medio/Bajo. Resultado: 0 críticos, 1 alto, 4 medios, 3 bajos. Se cerraron el Alto y los 4 Medios a pedido explícito; los 3 Bajos quedan pendientes (no se pidieron).

**[Alto] Rate limiter de "auth" colapsaba a un único bucket compartido detrás de un reverse proxy:** `Program.cs` particionaba la policy `"auth"` (login/forgot-password) por `Connection.RemoteIpAddress`, pero sin `UseForwardedHeaders` configurado — si el backend corre detrás de nginx (topología de producción probable, confirmada por el usuario), todas las requests llegan con la misma IP (la del proxy), y 10 intentos de cualquiera bastan para bloquear el login de todos. Fix: `app.UseForwardedHeaders(new ForwardedHeadersOptions { ForwardedHeaders = XForwardedFor | XForwardedProto })` como primer middleware del pipeline. Los defaults de `KnownNetworks`/`KnownProxies` (loopback) ya cubren nginx en la misma máquina/contenedor — si termina en un host/red distinta, hay que sumar esa IP/red. **Verificado en vivo:** 10 intentos simulando `X-Forwarded-For: 1.1.1.1` agotan su bucket (11º da 429), mientras `2.2.2.2` en simultáneo sigue funcionando — antes del fix ambos hubieran compartido el mismo bucket real (127.0.0.1).

**[Medio] `/auth/change-password` sin rate limiting:** login y forgot-password ya tenían `[EnableRateLimiting("auth")]`, change-password no. Se le agregó la misma policy (comparte el budget de 10/min por IP con login/forgot-password — simplificación explícita, no una policy separada). Verificado en vivo: 429 tras agotar el budget compartido.

**[Medio] Campos de contraseña sin `[MaxLength]`:** `LoginRequest.Password`, `ChangePasswordRequest.PasswordActual`/`PasswordNueva` ganaron `[MaxLength(200)]` (mismo patrón que ya tenían Motivo/Nombre/Correo) — sin esto, un "password" de varios MB amplifica el costo de CPU del hash PBKDF2 por request. `docs/openapi.yaml`: `LoginRequest.password` documentado con `maxLength: 200` (no existía un schema `ChangePasswordRequest` documentado — gap preexistente, no se creó acá, fuera de alcance de este batch). Verificado en vivo: password de 240 caracteres → 400 con el mensaje de validación esperado.

**[Medio] Contraseñas temporales (invitación/reset/forgot-password) nunca vencían:** los tres flujos comparten `PasswordResetService.IssueTemporaryPasswordAsync`, así que un único cambio cubre los tres. Entidad `User` ganó `TempPasswordExpiresAt` (`DateTime?`), seteado a `UtcNow.AddHours(48)` al emitir una temporal (48h: cubre un fin de semana sin dejarla vigente indefinidamente). `AuthService.ValidateCredentialsAsync` rechaza el login si `MustChangePassword` + venció (mismo mensaje genérico "Correo o contraseña inválidos" que el resto de los casos — no se distingue el motivo, mismo criterio anti-enumeración que ya usa el resto del login). `ChangePasswordAsync` limpia el campo al cambiar la contraseña de verdad. Migración `AddTempPasswordExpiresAt` (columna nullable, sin datos que migrar), aplicada contra la base de desarrollo real.

**Tests nuevos:** `PasswordResetServiceTests` (vencimiento a 48h), `AuthServiceTests` (login rechaza temporal vencida / acepta vigente, `ChangePasswordAsync` limpia el vencimiento) — 4 nuevos.

**Verification:** `dotnet build` 0/0, `dotnet test` **109/109** (105 + 4). Migración aplicada a dev sin incidentes. Los 3 hallazgos Bajos (condición de carrera en balance de PTO, API key de Resend en disco sin rotar, comodines SQL LIKE sin escapar en el filtro de nombre) quedan explícitamente sin tocar — no se pidieron.

**Dependencies:** ninguna.
