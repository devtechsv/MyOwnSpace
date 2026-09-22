# SPEC — OwnSpaceAPI (Backend de MyOwnSpace)

> Contraparte de `../SPEC.md` (frontend). El frontend ya está completo y construido contra una capa de mocks tipada (`src/services/mocks/`) que imita exactamente las firmas que esta API debe exponer — ese mock es la fuente de verdad de facto para el contrato, junto con `src/contracts/interfaces/` y `OwnSpace.md` (reglas de negocio).

## 1. Objetivo

Reemplazar la capa de mocks del frontend por una API real (C#/ASP.NET Core + SQL Server) sin que los componentes de React cambien: el día que esta API exista, el cambio en el frontend se limita a que `src/services/*.api.ts` llamen por HTTP (con `axios`, ya instalado) en vez de a `mockXAdapter` — misma firma de función, mismo shape de datos.

**Alcance de este documento:** diseño de la API (contrato OpenAPI + modelo de datos) como "mockup" del backend, antes de escribir una sola línea de C#. La implementación la escribe el usuario; Claude ayuda a diseñar, revisar y resolver dudas puntuales, no escribe el código de la API.

**Usuarios de la API:** únicamente el frontend de MyOwnSpace (no hay app móvil ni integraciones de terceros previstas).

## 2. Tech Stack

- **.NET 8 (LTS)**, ASP.NET Core Web API.
- **Entity Framework Core** (Code-First — migraciones versionadas en el repo) contra **SQL Server**.
- Autenticación: **JWT firmado, transportado en cookie httpOnly/Secure** (`accessToken`, mismo nombre que usa hoy el mock del frontend) — no `Authorization: Bearer`. Requiere CORS con `AllowCredentials` restringido al origen del frontend.
- Hashing de contraseñas: `PasswordHasher<T>` de ASP.NET Core Identity (o `BCrypt.Net-Next`) — nunca hash propio.
- Documentación interactiva: **Swagger UI** (`Swashbuckle.AspNetCore`) generado desde el contrato (`docs/openapi.yaml` es la fuente de diseño; el Swagger real se genera del código una vez implementado, y ambos deben coincidir).
- Envío de correos: interfaz `IEmailSender` con una implementación **stub** por ahora (loguea/persiste el "envío" sin proveedor real conectado) — se conecta un proveedor real (SMTP/SendGrid/etc., a decidir) más adelante sin tocar el resto del código.

## 3. Comandos (una vez creado el proyecto)

```bash
dotnet build                        # compilar
dotnet run --project src/OwnSpaceAPI.Api   # correr localmente
dotnet test                         # correr tests (xUnit)
dotnet ef migrations add <Nombre>   # nueva migración
dotnet ef database update           # aplicar migraciones pendientes
```

## 4. Estructura del proyecto

Un único proyecto Web API con separación por carpetas (no una solución multi-proyecto tipo Clean Architecture — el tamaño del dominio no lo justifica todavía; se puede partir en proyectos separados más adelante si crece):

```
OwnSpaceAPI/
  SPEC.md                    → este documento
  docs/
    openapi.yaml              → contrato de la API (mockup, fuente de diseño)
    er-diagram.md              → diagrama ER de la base de datos (mermaid)
  src/
    OwnSpaceAPI.Api/
      Controllers/              → AuthController, UsersController, RequestsController
      Models/
        Entities/                → User, LeaveRequest, PasswordResetToken (EF Core entities)
        Dtos/                    → shapes de request/response (espejo de src/contracts/interfaces/ del frontend)
      Services/                 → lógica de negocio (AuthService, UsersService, RequestsService, IEmailSender + implementación stub)
      Data/
        AppDbContext.cs
        Migrations/              → generadas por EF Core
      Program.cs
      appsettings.json           → sin secretos (connection string real va en appsettings.Development.json / variables de entorno, gitignored)
  tests/
    OwnSpaceAPI.Tests/           → xUnit
  OwnSpaceAPI.sln
```

## 5. Estilo de código

- Nombres en español para lo que refleja el dominio de negocio (igual que el frontend: `Nombre`, `Correo`, `Rol`, `Estado`, `Motivo`), en inglés para lo puramente técnico (`Controller`, `Service`, `Repository`, `DbContext`).
- `PascalCase` para tipos/métodos/propiedades públicas, `camelCase` con prefijo `_` para campos privados, sufijo `Async` en todo método asíncrono, `Nullable Reference Types` habilitado (`<Nullable>enable</Nullable>`).
- DTOs como `record` (inmutables, comparación por valor):

```csharp
public record CreateUserRequest(string Nombre, string Correo, UserRole Rol);

public record UserResponse(Guid Id, string Nombre, string Correo, UserRole Rol, UserStatus Estado);
```

- Los controllers no contienen lógica de negocio — delegan a un `Service` inyectado; el controller solo mapea HTTP ↔ DTOs y códigos de estado.

## 6. Estrategia de testing

- **xUnit**, tests junto a lo que prueban por feature (`tests/OwnSpaceAPI.Tests/Auth/`, `.../Users/`, `.../Requests/`).
- Servicios de negocio: tests unitarios con EF Core InMemory provider (rápidos, sin SQL Server real).
- Endpoints: al menos un test de integración por endpoint con `WebApplicationFactory<Program>` cubriendo el happy path + el caso de error principal (401/404/409 según corresponda) antes de considerar la tarea terminada — mismo estándar de rigor que tuvo el frontend (174/174 tests antes de cerrar cada tarea).
- Reglas de contraseña: **se revalidan en el backend** (no confiar solo en la validación del frontend) — puerto de `src/lib/password-rules.ts` a C#, mismas 6 reglas.

## 7. Límites (Boundaries)

- **Siempre:** validar todo input server-side (nunca confiar en que el frontend ya validó), hashear contraseñas, usar EF Core parametrizado (nunca SQL concatenado), correr los tests antes de dar una tarea por cerrada.
- **Preguntar primero:** cualquier cambio de esquema que afecte datos ya migrados, agregar un paquete NuGet nuevo, cambiar la estrategia de autenticación (cookie vs Bearer) una vez decidida, decidir el proveedor real de correo.
- **Nunca:** commitear cadenas de conexión o secretos reales, loguear contraseñas o tokens en texto plano, devolver el hash de la contraseña en ninguna respuesta.

## 8. Modelo de datos

Ver `docs/er-diagram.md` para el diagrama completo. Resumen:

- **Users** — espejo de `User` (frontend) + `PasswordHash`. `Rol` acepta `Empleado`/`Administrador` (el rol `SuperAdmin` se evaluó y se descartó — no se implementa).
- **LeaveRequests** — espejo de `LeaveRequest` (frontend). Sin jerarquía jefe-empleado: cualquier `Administrador` puede aprobar/denegar cualquier solicitud pendiente (igual que el mock actual).
- **PasswordResetTokens** — no existe equivalente en el mock (que usa el propio id de usuario como "token", documentado ahí como simplificación temporal). Necesaria para que "olvidé mi contraseña" e "invitación a definir contraseña" sean seguras de verdad: token opaco de un solo uso, con expiración, y se persiste su **hash** (no el valor en texto plano) — mismo principio que las contraseñas.

## 9. API

Ver `docs/openapi.yaml` para el contrato completo. Resumen por recurso:

| Método | Ruta | Rol requerido | Equivale a |
|---|---|---|---|
| POST | `/api/v1/auth/login` | público | `auth.api.ts#login` |
| POST | `/api/v1/auth/logout` | cualquiera autenticado | `auth.api.ts#logout` |
| GET | `/api/v1/auth/session` | cualquiera autenticado | `refresh-session.ts` (renovación deslizante de 2h) |
| POST | `/api/v1/auth/forgot-password` | público | `auth.api.ts#forgotPassword` |
| POST | `/api/v1/auth/set-password` | público (requiere token válido) | `auth.api.ts#setPassword` |
| GET | `/api/v1/users` | Administrador | `users.api.ts#list` |
| POST | `/api/v1/users` | Administrador | `users.api.ts#create` |
| PATCH | `/api/v1/users/{id}` | Administrador | `users.api.ts#update` |
| POST | `/api/v1/users/{id}/reset-password` | Administrador | `users.api.ts#resetPassword` |
| POST | `/api/v1/users/{id}/toggle-status` | Administrador | `users.api.ts#toggleStatus` |
| GET | `/api/v1/requests/mine` | Empleado | `requests.api.ts#listByEmployee` |
| GET | `/api/v1/requests/pending` | Administrador | `requests.api.ts#listPending` |
| POST | `/api/v1/requests` | Empleado | `requests.api.ts#create` |
| POST | `/api/v1/requests/{id}/approve` | Administrador | `requests.api.ts#approve` |
| POST | `/api/v1/requests/{id}/deny` | Administrador | `requests.api.ts#deny` |

Un rol insuficiente devuelve **404**, no 401/403 — misma regla de seguridad que ya aplica `with-auth.tsx` en el frontend (nunca confirmar que una ruta existe si no se tiene acceso).

**Notificaciones por correo** (`OwnSpace.md`: "se te mandaría un correo electrónico si tu caso fue aprobado o rechazado"): se disparan desde el backend en `approve`/`deny`/`forgot-password`/`create user`/`reset-password`, vía `IEmailSender` (stub por ahora — ver open questions).

## 10. Criterios de éxito

- `docs/openapi.yaml` cubre los 14 endpoints de la tabla anterior, con schemas de request/response, códigos de estado y requisito de rol documentado por endpoint.
- `docs/er-diagram.md` cubre las 3 tablas, sus columnas, tipos, constraints (unique, FK, check) y relaciones.
- El Swagger UI generado por el código, una vez implementado, no diverge del contrato en `docs/openapi.yaml` (si diverge, se actualiza el que esté desactualizado — el contrato es la fuente de verdad de diseño, pero el código es la fuente de verdad de lo que realmente corre).
- `dotnet build` y `dotnet test` pasan sin errores antes de dar por cerrada cualquier tarea de implementación.

## 11. Open Questions

- **Proveedor real de correo**: queda como stub (`IEmailSender` sin proveedor conectado) hasta que se decida (SMTP de DevTech, SendGrid, etc.) — no bloquea el resto del desarrollo.
- **Rotación/revocación de sesión**: logout hoy es puramente del lado del cliente (borra la cookie); un JWT robado sigue siendo válido hasta su expiración natural (máx. 2h) aunque el usuario haga logout. Aceptado como límite conocido para esta etapa (herramienta interna); si se necesita revocación real más adelante, requiere una tabla de sesiones/blacklist — no está en este alcance.
- **Migración del frontend** (cambiar `services/*.api.ts` de mock a HTTP real): queda para cuando esta API esté implementada; no es parte de este spec.
- **Lista de contraseñas genéricas bloqueadas divergente del frontend**: durante la Tarea 7, la lista implementada en el backend (`Services/PasswordRules.cs`) quedó ampliada respecto a `CONTRASENAS_GENERICAS` de `src/lib/password-rules.ts` (frontend) — perdió `devtech123!` y sumó `12345`/`contrasena`/`contraseña`/`incorrecta`/`incorrecto`. Decisión: se mantiene la lista del backend (es la que manda, ya que revalida server-side); pendiente actualizar el frontend para que coincida, así ambos validadores no disienten en ningún caso límite.
