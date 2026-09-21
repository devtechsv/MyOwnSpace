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
