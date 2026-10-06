# OwnSpaceAPI

Backend de MyOwnSpace (.NET 8 + Entity Framework Core + SQL Server). Ver `SPEC.md` para el alcance y `docs/openapi.yaml` / `docs/er-diagram.md` para el contrato y el modelo de datos.

## Requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQL Server (local o accesible) — se probó contra una instancia local con autenticación de Windows
- Herramienta `dotnet-ef`: `dotnet tool install --global dotnet-ef`

## Setup

1. Clona el repo y ubícate dentro de `OwnSpaceAPI/`.
2. Crea `src/OwnSpaceAPI.Api/appsettings.Development.json` (no se commitea) con tu connection string real, una clave de firma JWT propia, el origen de tu frontend, la cuenta de Resend para enviar correos y la contraseña temporal del primer Administrador:

   ```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=OwnSpaceDb;Trusted_Connection=True;TrustServerCertificate=True;"
     },
     "Jwt": {
       "Issuer": "OwnSpaceAPI",
       "Audience": "OwnSpaceAPI",
       "SigningKey": "<una clave aleatoria de al menos 32 caracteres>"
     },
     "Cors": {
       "AllowedOrigins": ["http://localhost:3000"]
     },
     "Resend": {
       "ApiKey": "<API key de resend.com>",
       "FromAddress": "MyOwnSpace <onboarding@resend.dev>"
     },
     "Seed": {
       "AdminPassword": "<contraseña temporal del primer Administrador>"
     }
   }
   ```

   `Resend` es obligatorio: sin `ApiKey` y `FromAddress` la API no arranca. Con una cuenta de Resend sin dominio verificado (modo de prueba) solo se entregan correos a la dirección dueña de la cuenta; para enviar a cualquier empleado hay que verificar el dominio en resend.com y usar un `FromAddress` de ese dominio.

3. Aplica las migraciones (crea la base si no existe):

   ```bash
   dotnet ef database update --project src/OwnSpaceAPI.Api --startup-project src/OwnSpaceAPI.Api
   ```

   La API **no** aplica migraciones sola al arrancar: este paso se repite cada vez que traes cambios que agregan una migración (ver [Actualizar un ambiente existente](#actualizar-un-ambiente-existente)).

4. Levanta la API:

   ```bash
   dotnet run --project src/OwnSpaceAPI.Api --launch-profile https
   ```

5. Abre `https://localhost:7127/swagger` para ver y probar los endpoints.

## Crear el primer usuario Administrador

No hay UI ni endpoint de registro. Al arrancar, si todavía no existe ningún Administrador en la base, se siembra uno automáticamente (`SeedData.SeedAdminAsync`) usando la contraseña de `Seed:AdminPassword` configurada arriba. Nace en estado Activo con correo `admin@devtch.com` (configurable con `Seed:AdminEmail`) y tiene que cambiar su contraseña en el primer login, igual que cualquier usuario invitado desde el panel — esa temporal vence a las 48h si nadie la usa. El resto de los usuarios se crean después desde el panel de Admin.

`Seed:AdminPassword` tiene que cumplir la misma política que cualquier otra contraseña del sistema (`PasswordRules.IsValid`: 10+ caracteres, mayúscula, minúscula, número y carácter especial). Si falta o no la cumple, el servidor **no falla al arrancar** — solo registra un warning en el log y no crea el Administrador; si no puedes iniciar sesión después de un primer arranque, revisa el log antes de sospechar de otra cosa.

Esta siembra corre en todo entorno (no solo desarrollo) porque es idempotente: no tiene ningún efecto sobre una base que ya tiene un Administrador. En producción se configura por variable de entorno (`Seed__AdminPassword`), nunca en `appsettings.json`, y solo importa la primera vez que arranca contra una base vacía.

### Si no puedes iniciar sesión como Administrador

- Si hay más de un Admin activo, que otro te resetee la contraseña desde el panel — el flujo normal, sin tocar la base.
- Si es el único Admin y nadie sabe la contraseña, no hay forma de recuperarla (está hasheada). Hay que borrar esa fila de `Users` y reiniciar el backend — `SeedAdminAsync` vuelve a sembrarlo con `Seed:AdminPassword` (pierde el `Id` y el historial de ese usuario).

Para evitar llegar a este punto, mantén siempre 2 o más Administradores activos.

## Actualizar un ambiente existente

Cada vez que se trae una versión nueva del backend a un ambiente que ya tiene base de datos (otro equipo de desarrollo, QA, producción):

1. **Revisa qué migraciones faltan** en esa base:

   ```bash
   dotnet ef migrations list --project src/OwnSpaceAPI.Api --startup-project src/OwnSpaceAPI.Api
   ```

   Las que aparecen como `(Pending)` todavía no se aplicaron. Los comandos de `dotnet ef` compilan el proyecto: si la API está corriendo en ese mismo equipo, detenla antes (o agrega `--no-build` si ya está compilado).

2. **Aplícalas antes de levantar la API nueva** — el código nuevo espera las columnas nuevas y falla si no existen. Elige una forma:

   - Con acceso directo a la base: `dotnet ef database update` usa la connection string configurada. Para apuntar a otra base solo durante el comando (PowerShell):

     ```powershell
     $env:ConnectionStrings__DefaultConnection = "Server=...;Database=...;User Id=...;Password=..."
     dotnet ef database update --project src/OwnSpaceAPI.Api --startup-project src/OwnSpaceAPI.Api
     Remove-Item Env:ConnectionStrings__DefaultConnection
     ```

   - Sin acceso directo (lo habitual en producción): genera un script SQL y entrégaselo a quien administre la base. `--idempotent` lo hace seguro de ejecutar aunque algunas migraciones ya estén aplicadas:

     ```bash
     dotnet ef migrations script --idempotent --project src/OwnSpaceAPI.Api --startup-project src/OwnSpaceAPI.Api -o migraciones.sql
     ```

3. **Despliega primero el backend y después el frontend** (o los dos juntos). El frontend nuevo puede enviar filtros que un backend anterior ignora sin dar error, y mostraría datos sin filtrar.

### Configuración fuera de desarrollo

Fuera de desarrollo no se usa `appsettings.Development.json`: cada valor va como variable de entorno (`:` se escribe `__`), nunca en `appsettings.json`:

| Variable | Contenido |
|---|---|
| `ConnectionStrings__DefaultConnection` | Connection string de SQL Server |
| `Jwt__SigningKey` | Clave aleatoria de 32+ caracteres, distinta a la de desarrollo |
| `Cors__AllowedOrigins__0` | URL pública del frontend (`__1`, `__2`… para más de una) |
| `Auth__CookieDomain` | Opcional. Solo si frontend y API están en subdominios distintos: el dominio común, p. ej. `dominio.com` (ver [Despliegue](../README.md#despliegue)) |
| `Resend__ApiKey`, `Resend__FromAddress` | Cuenta de Resend con el dominio verificado |
| `Seed__AdminPassword` | Solo para el primer arranque contra una base vacía |

Otras consideraciones:

- **Zona horaria:** las fechas de negocio ("hoy", vencimiento del PTO) se calculan en hora de El Salvador. Si el servidor no tiene la base de zonas horarias (p. ej. un contenedor Linux mínimo sin `tzdata`), se usa UTC−6 fijo, que da el mismo resultado porque El Salvador no tiene horario de verano.
- **Correos:** se envían en segundo plano desde una cola en memoria. Si la API se reinicia justo después de una acción que envía correo (p. ej. "Olvidé mi contraseña"), ese correo puede perderse; basta con repetir la acción.

### Migraciones con efecto a tener en cuenta

| Migración | Qué hace |
|---|---|
| `20261006142507_SeparateTempPassword` | Agrega 3 columnas a `Users` (`TempPasswordHash`, `ForgotPasswordWindowStart`, `ForgotPasswordCount`). No modifica datos existentes. Desde esta versión, "Olvidé mi contraseña" ya no invalida la contraseña actual y las vacaciones de un solo día quedan pendientes de aprobación. |

## Comandos

```bash
dotnet build                        # compilar
dotnet test                         # correr tests (xUnit)
dotnet ef migrations add <Nombre>   # nueva migración
dotnet ef database update           # aplicar migraciones pendientes
```

## Estructura

Ver `SPEC.md` §4.
