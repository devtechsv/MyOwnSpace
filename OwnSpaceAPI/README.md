# OwnSpaceAPI

Backend de MyOwnSpace (.NET 8 + Entity Framework Core + SQL Server). Ver `SPEC.md` para el alcance y `docs/openapi.yaml` / `docs/er-diagram.md` para el contrato y el modelo de datos.

## Requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQL Server (local o accesible) — se probó contra una instancia local con autenticación de Windows
- Herramienta `dotnet-ef`: `dotnet tool install --global dotnet-ef`

## Setup

1. Clona el repo y ubícate dentro de `OwnSpaceAPI/`.
2. Crea `src/OwnSpaceAPI.Api/appsettings.Development.json` (no se commitea) con tu connection string real, una clave de firma JWT propia, el origen de tu frontend, y la contraseña temporal del primer Administrador:

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
     "Seed": {
       "AdminPassword": "<contraseña temporal del primer Administrador>"
     }
   }
   ```

3. Aplica las migraciones (crea la base si no existe):

   ```bash
   dotnet ef database update --project src/OwnSpaceAPI.Api --startup-project src/OwnSpaceAPI.Api
   ```

4. Levanta la API:

   ```bash
   dotnet run --project src/OwnSpaceAPI.Api --launch-profile https
   ```

5. Abre `https://localhost:7127/swagger` para ver y probar los endpoints.

## Crear el primer usuario Administrador

No hay UI ni endpoint de registro. Al arrancar, si todavía no existe ningún Administrador en la base, se siembra uno automáticamente (`SeedData.SeedAdminAsync`) usando la contraseña de `Seed:AdminPassword` configurada arriba. Nace en estado Activo con correo `admin@devtch.com` (configurable con `Seed:AdminEmail`) y tiene que cambiar su contraseña en el primer login, igual que cualquier usuario invitado desde el panel — esa temporal vence a las 48h si nadie la usa. El resto de los usuarios se crean después desde el panel de Admin.

`Seed:AdminPassword` tiene que cumplir la misma política que cualquier otra contraseña del sistema (`PasswordRules.IsValid`: 10+ caracteres, mayúscula, minúscula, número y carácter especial). Si falta o no la cumple, el servidor **no falla al arrancar** — solo registra un warning en el log y no crea el Administrador; si no podés loguearte después de un primer arranque, revisá el log antes de sospechar de otra cosa.

Esta siembra corre en todo entorno (no solo desarrollo) porque es idempotente: no tiene ningún efecto sobre una base que ya tiene un Administrador. En producción se configura por variable de entorno (`Seed__AdminPassword`), nunca en `appsettings.json`, y solo importa la primera vez que arranca contra una base vacía.

### Si no podés loguearte como Administrador

- Si hay más de un Admin activo, que otro te resetee la contraseña desde el panel — el flujo normal, sin tocar la base.
- Si es el único Admin y nadie sabe la contraseña, no hay forma de recuperarla (está hasheada). Hay que borrar esa fila de `Users` y reiniciar el backend — `SeedAdminAsync` vuelve a sembrarlo con `Seed:AdminPassword` (pierde el `Id` y el historial de ese usuario).

Para evitar llegar a este punto, mantené siempre 2 o más Administradores activos.

## Comandos

```bash
dotnet build                        # compilar
dotnet test                         # correr tests (xUnit)
dotnet ef migrations add <Nombre>   # nueva migración
dotnet ef database update           # aplicar migraciones pendientes
```

## Estructura

Ver `SPEC.md` §4.
