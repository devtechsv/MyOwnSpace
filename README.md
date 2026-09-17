# OwnSpaceAPI

Backend de MyOwnSpace (.NET 8 + Entity Framework Core + SQL Server). Ver `SPEC.md` para el alcance y `docs/openapi.yaml` / `docs/er-diagram.md` para el contrato y el modelo de datos.

## Requisitos

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- SQL Server (local o accesible) — se probó contra una instancia local con autenticación de Windows
- Herramienta `dotnet-ef`: `dotnet tool install --global dotnet-ef`

## Setup

1. Cloná el repo y parate dentro de `OwnSpaceAPI/`.
2. Creá `src/OwnSpaceAPI.Api/appsettings.Development.json` (no se commitea) con tu connection string real, una clave de firma JWT propia, y el origen de tu frontend:

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
     }
   }
   ```

3. Aplicá las migraciones (crea la base si no existe):

   ```bash
   dotnet ef database update --project src/OwnSpaceAPI.Api --startup-project src/OwnSpaceAPI.Api
   ```

4. Levantá la API:

   ```bash
   dotnet run --project src/OwnSpaceAPI.Api --launch-profile https
   ```

5. Abrí `https://localhost:7127/swagger` para ver y probar los endpoints.

En modo desarrollo, la base se siembra sola con datos de ejemplo (mismos usuarios/solicitudes que el mock del frontend) la primera vez que corre.

## Comandos

```bash
dotnet build                        # compilar
dotnet test                         # correr tests (xUnit)
dotnet ef migrations add <Nombre>   # nueva migración
dotnet ef database update           # aplicar migraciones pendientes
```

## Estructura

Ver `SPEC.md` §4.
