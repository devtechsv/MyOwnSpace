# MyOwnSpace

Herramienta interna de DevTech para gestionar solicitudes de permiso (empleado) y su aprobación/denegación (administrador).

Este repo contiene el **frontend** (Next.js 16 + TypeScript, Pages Router) y, en `OwnSpaceAPI/`, el **backend** (.NET 8 + Entity Framework Core + SQL Server). El frontend puede correr contra el backend real o contra una capa de mocks tipada (`src/services/mocks/`), útil para desarrollar sin tener la API ni SQL Server levantados. Ver `SPEC.md` para el alcance y las reglas de negocio, y `tasks/plan.md` / `tasks/todo.md` para el detalle de implementación.

## Documentación

- [`docs/manual-usuario.md`](docs/manual-usuario.md) — cómo usar la aplicación, para el usuario final (sin nada técnico).
- [`docs/guia-tecnica.md`](docs/guia-tecnica.md) — referencia de endpoints (CRUD) y guía de dónde tocar el código para mantener o extender cada entidad.

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

### Al traer cambios nuevos

- Corre `npm install` si cambió `package.json` o `package-lock.json`, y **reinicia** `npm run dev`: un servidor que quedó corriendo con las dependencias anteriores responde 500 en todas las páginas.
- Si usas el backend real, aplica las migraciones pendientes antes de levantarlo (ver [Actualizar un ambiente existente](OwnSpaceAPI/README.md#actualizar-un-ambiente-existente)).

## Despliegue

1. **Backend primero:** aplica las migraciones pendientes y despliega la API siguiendo [Actualizar un ambiente existente](OwnSpaceAPI/README.md#actualizar-un-ambiente-existente).
2. **Frontend después:** `NEXT_PUBLIC_USE_REAL_API=true` y `NEXT_PUBLIC_API_URL` (URL pública de la API, terminada en `/api/v1`) se fijan **al momento del build** (`npm run build`), no al arrancar: si cambian, hay que volver a compilar.
3. **Frontend y API en el mismo dominio**, por HTTPS. El frontend verifica la sesión desde su servidor (`withAuth`) leyendo la cookie que crea la API, así que el navegador tiene que mandársela a los dos. Hay dos formas:
   - **Mismo host** (sin configurar nada): la API detrás de un proxy en el mismo dominio, p. ej. `https://app.dominio.com/api/v1`.
   - **Subdominios distintos** (`app.dominio.com` y `api.dominio.com`): define `Auth__CookieDomain=dominio.com` en el backend para que la cookie valga para ambos. Sin esto, el login responde bien pero cada página vuelve al login.

   Dominios totalmente distintos (`miapp.com` y `otraapi.com`) no funcionan: la cookie es `SameSite=Lax`. En local no hace falta nada porque las cookies ignoran el puerto (`localhost:3000` y `localhost:7127` cuentan como el mismo host).
4. La URL del frontend tiene que estar en `Cors__AllowedOrigins` del backend.

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
    - `mocks/` — capa de mocks tipada para desarrollar sin backend, incluida su copia de la calculadora de PTO (`pto-balance-calculator.ts`)
  - `contracts/`
    - `interfaces/` — contratos compartidos (`User`, `LeaveRequest`, `Session`, etc.)
    - `enums/endpoints/` — constantes de rutas de la API
  - `middlewares/with-auth.tsx` — guard de sesión/rol para `getServerSideProps`
  - `hooks/` — `useSession`, `useTheme`, `useLogout`, `useModalAlly`
  - `lib/` — `password-rules.ts` (duplica a mano la política del backend, solo para feedback en vivo del formulario), `dias-habiles.ts` (aritmética de días hábiles para el calendario y la solicitud por rango), `theme-init-script.js`
  - `styles/` — Tailwind y tokens de tema (claro/oscuro)
- `test-data/` — `pto-calculadora-casos.json`: casos de la calculadora de PTO que corren las pruebas del backend y del frontend
- `tasks/` — `plan.md` / `todo.md`, historial de implementación
