# MyOwnSpace

Herramienta interna de DevTech para gestionar solicitudes de permiso (empleado) y su aprobación/denegación (administrador).

Este repo contiene el **frontend** (Next.js 16 + TypeScript, Pages Router) y, en `OwnSpaceAPI/`, el **backend** (.NET 8 + Entity Framework Core + SQL Server). El frontend puede correr contra el backend real o contra una capa de mocks tipada (`src/services/mocks/`), útil para desarrollar sin tener la API ni SQL Server levantados. Ver `SPEC.md` para el alcance y las reglas de negocio, y `tasks/plan.md` / `tasks/todo.md` para el detalle de implementación.

## Requisitos

- [Node.js 20.9+](https://nodejs.org/) y npm
- Para usar el backend real (en vez de los mocks): ver los requisitos de [`OwnSpaceAPI/README.md`](OwnSpaceAPI/README.md) (.NET 8 SDK, SQL Server, `dotnet-ef`)

## Setup

1. Clona el repo e instala las dependencias:

   ```bash
   npm install
   ```

2. Elige el modo de trabajo:

   - **Con mocks** (no requiere backend): no hace falta configurar nada más, saltar al paso 4.
   - **Con el backend real**: levanta primero la API siguiendo [`OwnSpaceAPI/README.md`](OwnSpaceAPI/README.md). Luego, si es la primera vez, confía en el certificado de desarrollo (si no, el navegador rechaza la cookie de sesión por el flag `Secure`):

     ```bash
     dotnet dev-certs https --trust
     ```

3. Si vas a usar el backend real, copia `.env.example` a `.env.local` (gitignorado):

   ```bash
   cp .env.example .env.local
   ```

   `.env.example` ya trae los defaults para apuntar al perfil HTTPS local de `OwnSpaceAPI` (`https://localhost:7127/api/v1`); ajusta `NEXT_PUBLIC_API_URL` solo si tu backend corre en otro puerto.

4. Levanta el servidor de desarrollo:

   ```bash
   npm run dev
   ```

   Abre `http://localhost:3000`.

## Comandos

```bash
npm run dev        # servidor de desarrollo (http://localhost:3000)
npm run build       # build de producción
npm run start        # sirve el build de producción
npm run test          # suite de tests (Jest + React Testing Library)
npm run test:watch     # suite de tests en modo watch
npm run typecheck       # chequeo de tipos (tsc --noEmit)
npm run lint              # ESLint
```

## Estructura del repo

- `README.md`, `SPEC.md`, `.gitignore` — el frontend vive en la raíz del repo, no en una subcarpeta propia
- `OwnSpaceAPI/` — backend (.NET 8 + EF Core + SQL Server), 1 proyecto + tests — ver su propio [README](OwnSpaceAPI/README.md)
  - `OwnSpaceAPI.sln`
  - `global.json` — SDK fijado a `8.0.424`
  - `src/OwnSpaceAPI.Api/` — API y dominio en un solo proyecto (sin capas separadas Domain/Infrastructure)
    - `Program.cs` — DI, auth JWT, CORS, rate limiting y el resto del pipeline
    - `Controllers/` — `AuthController`, `UsersController`, `RequestsController`, `PtoController`
    - `Models/Entities/` — `User`, `LeaveRequest`, `Enums`
    - `Models/Dtos/` — records de request/response, uno por área (`Auth/`, `Users/`, `Requests/`, `Pto/`, `Common/`)
    - `Services/` — lógica de negocio (interfaz + implementación por área: `Auth/`, `Users/`, `Requests/`, `Pto/`), más `PasswordRules.cs`, `PasswordHashingService.cs`, `ResendEmailSender.cs`
    - `Data/`
      - `AppDbContext.cs`
      - `SeedData.cs` — siembra el primer Administrador al arrancar (ver [Crear el primer usuario Administrador](OwnSpaceAPI/README.md#crear-el-primer-usuario-administrador))
      - `Migrations/`
    - `appsettings.json` / `appsettings.Development.json` (no se commitea)
  - `tests/OwnSpaceAPI.Tests/` — pruebas (xUnit), por área (`Auth/`, `Users/`, `Requests/`, `Pto/`, `Integration/`)
  - `docs/` — `openapi.yaml`, `er-diagram.md`
- `src/` — frontend (Next.js 16, Pages Router)
  - `pages/` — rutas: `login.tsx`, `index.tsx`, `pto.tsx`, `forgot-password.tsx` (+ `forgot-password/sent.tsx`), `change-password-required.tsx`, `admin/` (`users.tsx`, `requests.tsx`, `pto.tsx`), `_app.tsx`, `_document.tsx`, `404.tsx`
  - `components/`
    - `pages/` — componentes propios de cada página (`login/`, `forgot-password/`, `employee/`, `admin/`, `pto/`, `not-found/`)
    - `layout/` — `AppShell`, `Sidebar`, `Topbar`, `ThemeToggle`, compartidos por todo el panel
    - `common/` — modales y controles de formulario reutilizables
  - `services/`
    - `api-services.ts` — punto de acceso único al backend
    - `use-real-api.ts` — switch entre mocks y API real (`NEXT_PUBLIC_USE_REAL_API`)
    - `auth/`, `users/`, `requests/`, `pto/` — adaptadores por dominio (mock + HTTP)
    - `mocks/` — capa de mocks tipada para desarrollar sin backend
  - `contracts/`
    - `interfaces/` — contratos compartidos (`User`, `LeaveRequest`, `Session`, etc.)
    - `enums/endpoints/` — constantes de rutas de la API
  - `middlewares/with-auth.tsx` — guard de sesión/rol para `getServerSideProps`
  - `hooks/` — `useSession`, `useTheme`, `useLogout`, `useModalAlly`
  - `lib/` — `password-rules.ts` (duplica a mano la política del backend, solo para feedback en vivo del formulario), `pto-balance-calculator.ts`, `theme-init-script.js`
  - `styles/` — Tailwind y tokens de tema (claro/oscuro)
- `tasks/` — `plan.md` / `todo.md`, historial de implementación
