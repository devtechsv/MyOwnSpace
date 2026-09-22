# SPEC — MyOwnSpace (Frontend)

> Alcance de este documento: **solo el frontend** (Next.js + TypeScript). El backend (ASP.NET Core + SQL Server) se especifica en un documento aparte más adelante. Mientras no exista, el frontend se construye contra una capa de mocks tipada que respeta el contrato de datos definido acá, para minimizar el retrabajo cuando el backend esté listo.

Fuentes de este spec: `OwnSpace.md` (reglas de negocio), el mockup validado en Claude Design (11 pantallas), y el código ya existente en el repo.

---

## 1. Objetivo

MyOwnSpace es una herramienta interna de DevTech para que los empleados generen solicitudes de permiso (emergencia, enfermedad, permiso personal, otro) y sus jefes las aprueben o denieguen. Es 100% interno por ahora, con intención de convertirse en producto vendible a futuro — por eso el frontend debe quedar desacoplado de un backend específico (contratos tipados, no llamadas ad-hoc).

**Usuarios objetivo:**
- **Empleado** — crea solicitudes, ve el estado de las propias, gestiona su propia cuenta (perfil, contraseña).
- **Jefe (Administrador)** — aprueba/deniega solicitudes de su equipo, gestiona usuarios (crear, editar, resetear contraseña, activar/desactivar).
- ~~**SuperAdmin**~~ — rol mencionado originalmente en `OwnSpace.md`; se evaluó qué lo distinguiría del Jefe/Administrador y se decidió (2026-09-21) que no hace falta — **eliminado**, no se implementa.

---

## 2. Comandos

Ya definidos en `package.json`:

| Comando | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo (`next dev`) |
| `npm run build` | Build de producción |
| `npm run start` | Servir el build de producción |
| `npm run lint` | ESLint (`eslint-config-next`) |

**A agregar** (no existen todavía en el proyecto):

| Comando | Uso |
|---|---|
| `npm run test` | Jest + React Testing Library, vía `next/jest` (soporte oficial de Next.js, cero configuración adicional de webpack/babel) |
| `npm run test:watch` | Igual, en modo watch |
| `npm run typecheck` | `tsc --noEmit` |

---

## 3. Estructura del proyecto

Se respeta la estructura ya existente; se agregan las carpetas necesarias por módulo:

```
src/
  pages/
    login.tsx                    (existe — se reescribe)
    forgot-password.tsx          (nuevo)
    forgot-password/sent.tsx     (nuevo)
    set-password.tsx             (nuevo — sirve tanto a "usuario nuevo" como a "reset")
    index.tsx                    (existe — dashboard Empleado, se reescribe)
    admin/
      requests.tsx                (nuevo — dashboard Admin, Solicitudes)
      users.tsx                   (nuevo — dashboard Admin, Usuarios)
    404.tsx                      (nuevo — página de error de Next.js, override del default)
    api/hello.ts                 (existente, sin uso real — eliminar en la limpieza final)

  components/
    common/                      (existe: Button, SpinnerLoader, form/TextInput)
    layout/
      AppShell.tsx                (nuevo — topbar + sidebar + slot de contenido)
      Topbar.tsx                  (nuevo — logo, toggle tema, dropdown de perfil)
      Sidebar.tsx                  (nuevo — nav por rol)
      ThemeToggle.tsx              (nuevo)
    pages/
      login/                      (existe — se reescribe LoginForm/useLoginForm)
      forgot-password/            (nuevo)
      set-password/               (nuevo — incluye el checklist de requisitos)
      employee/
        RequestsTable.tsx          (nuevo)
        CreateRequestModal.tsx     (nuevo)
      admin/
        RequestsTable.tsx          (nuevo)
        UsersTable.tsx              (nuevo)
        CreateUserModal.tsx         (nuevo)
        ResetPasswordConfirmModal.tsx (nuevo)

  contracts/
    interfaces/
      user.ts                     (nuevo — User, UserRole, UserStatus)
      request.ts                  (nuevo — LeaveRequest, RequestType, RequestStatus)
      auth.ts                     (nuevo — Session, LoginPayload, etc.)
    enums/
      endpoints/
        auth-endpoints.ts          (existe)
        request-endpoints.ts       (nuevo)
        user-endpoints.ts          (nuevo)

  services/
    axios-config.ts               (existe)
    auth/
      auth.api.ts                  (existe — se completa: login, forgotPassword, setPassword)
      refresh-session.ts           (existe)
    requests/
      requests.api.ts               (nuevo)
    users/
      users.api.ts                  (nuevo)
    mocks/
      mock-data.ts                  (nuevo — fixtures en memoria: usuarios y solicitudes de ejemplo)
      mock-adapter.ts                (nuevo — implementa las mismas firmas que *.api.ts con latencia simulada)

  hooks/
    useTheme.ts                    (nuevo — lee/persiste modo oscuro/claro)
    useSession.ts                  (nuevo — expone el usuario actual y su rol desde la sesión SSR)

  middlewares/
    with-auth.tsx                  (existe — se extiende: soporte de roles, expiración 2h)

  lib/
    password-rules.ts               (nuevo — los 6 requisitos de contraseña, reutilizado por el checklist y la validación de formulario)
```

---

## 4. Estilo de código

Se sigue el patrón ya presente en el repo — no se introducen convenciones nuevas:

- **Componentes**: function components, un componente por archivo, `PascalCase.tsx`.
- **Formularios**: `react-hook-form` + `zod` (`zodResolver`), con un hook `useXxxForm` separado del componente visual (patrón ya usado en `useLoginForm.ts`).
- **Clases condicionales**: helper `cx()` existente (`src/helpers/cx.ts`), no `clsx` ni `classnames` directo en componentes.
- **Iconos**: `react-icons` (ya en dependencias) — no SVGs sueltos pegados en componentes de producción (a diferencia del mockup, que sí los usa por ser HTML estático).
- **Tipado**: sin `any`; los contratos de datos (`User`, `LeaveRequest`, etc.) viven en `src/contracts/interfaces/` y se importan, no se redefinen inline en cada componente.
- **Tailwind**: se extiende `tailwind.config.ts` con `darkMode: 'class'` y tokens semánticos (`bg`, `surface`, `border`, `text`, `text-muted`) para claro/oscuro, siguiendo los valores ya validados en el mockup — en vez de repetir clases `dark:bg-[#...]` sueltas por todo el código.
- **Nombres de dominio en español**: los tipos de solicitud, estados y textos de UI se mantienen en español (`'Pendiente' | 'Aprobada' | 'Denegada'`), consistente con el resto del proyecto y el mockup — no se traducen a inglés.

---

## 5. Estrategia de testing

El proyecto no tiene test runner configurado todavía. Se propone:

- **Jest + React Testing Library**, vía `next/jest`.
- **Qué se prueba primero** (orden de prioridad, siguiendo el mapa de capacidades):
  1. `lib/password-rules.ts` — unit tests puros de cada regla (10+ caracteres, mayúscula, minúscula, número, especial, no-genérica).
  2. `middlewares/with-auth.tsx` — que redirige a `/login` sin token válido, y a `/404` (no a una página de "sin permiso") cuando el rol no alcanza.
  3. Formularios (`useLoginForm`, `useCreateRequestForm`, etc.) — validación de campos con zod.
  4. Componentes de tabla (`RequestsTable`, `UsersTable`) — que renderizan los estados/acciones correctos según el dato recibido (ej. fila con estado "Desactivado" muestra botón "Activar", no "Desactivar").
- **Fuera de alcance de tests automatizados por ahora**: integración real con el backend (no existe), y visual/e2e (Playwright) — se evalúa cuando el backend esté disponible.

---

## 6. Límites (boundaries)

**Siempre:**
- Igualar el sistema visual ya validado en el mockup (colores `turquoise-blue`, tipografía Inter, radios y espaciados de los tokens definidos).
- Los componentes de UI consumen los servicios (`*.api.ts`), nunca a `axios` directo ni a los mocks directamente — así el día que exista el backend real, cambiar de mock a real es un cambio en un solo lugar (factory/flag en `services/`).
- Todo texto de cara al usuario en español, igual que el mockup y `OwnSpace.md`.
- Cualquier pantalla nueva no contemplada en el mockup se avisa antes de construirse.

**Preguntar antes:**
- Cambios en la forma de los contratos de datos (`User`, `LeaveRequest`) una vez que el backend empiece a especificarse — para no divergir.
- Agregar dependencias nuevas no listadas en `package.json` (ej. otra librería de formularios, otro sistema de theming).

**Nunca:**
- Hardcodear URLs o credenciales del backend real en el código (usar `NEXT_PUBLIC_API_URL`, ya existente).
- Implementar lógica de negocio del backend en el frontend (ej. verificación real de contraseña, generación de tokens) — el frontend solo valida forma/formato en el cliente; la verdad de negocio vive en la API.
- Revelar en la UI si un correo existe o no en el sistema (ya resuelto en el mockup de "Olvidé mi contraseña" con mensaje genérico) — mantener ese comportamiento cuando se implemente.
- Mostrar un mensaje de "no tienes permiso" en rutas restringidas — siempre 404 genérico, por la regla de seguridad de `OwnSpace.md`.

---

## Módulos (orden de construcción)

### Módulo 1 — `auth`
*Sin dependencias. Es la base de todo lo demás.*

**Pantallas:** Login, Olvidé mi contraseña, Correo enviado, Definir nueva contraseña, 404, banner de sesión expirada (parte de Login).

**Criterios de aceptación:**
- El login valida email + password en el cliente (zod) antes de enviar; el envío real llama a `auth.api.login()`.
- Sin token válido en cookies, cualquier ruta protegida redirige a `/login` (ya funciona vía `withAuth`; se mantiene).
- El token expira a las 2 horas de inactividad → al expirar, la próxima navegación redirige a `/login?expired=1` y el login muestra el banner correspondiente.
- "Olvidé mi contraseña" nunca confirma si el correo existe; siempre muestra el mismo mensaje de confirmación.
- "Definir nueva contraseña" valida en vivo los 6 requisitos (`lib/password-rules.ts`) y deshabilita "Guardar" hasta que todos se cumplan.
- Ruta inexistente o sin permiso → página 404 genérica, nunca un mensaje que confirme "existe pero no tienes acceso".
- Toggle de modo oscuro/claro funcional y persistente (`useTheme`, `localStorage`), disponible desde el login.

**Contratos de datos:**
```ts
interface LoginPayload { correo: string; password: string; }
interface Session { userId: string; nombre: string; rol: UserRole; estado: UserStatus; }
interface SetPasswordPayload { token: string; nuevaPassword: string; }
```

---

### Módulo 2 — `shell`
*Depende de: `auth`.*

**Qué es:** el armazón que envuelven las pantallas autenticadas — Topbar (logo, toggle de tema, dropdown Perfil/Cambiar contraseña/Cerrar sesión) y Sidebar (navegación según rol).

**Criterios de aceptación:**
- El contenido del Sidebar cambia según `Session.rol`: Empleado ve "Crear solicitud"; Administrador ve "Solicitudes" y "Usuarios".
- "Cambiar contraseña" en el dropdown abre el mismo flujo de confirmación por correo que "Resetear contraseña" (ya decidido: mismo popup, aplicado a la propia cuenta).
- El shell no se renderiza para un usuario sin sesión válida (lo resuelve `withAuth` antes de llegar al componente).

---

### Módulo 3 — `employee-requests`
*Depende de: `shell`.*

**Pantallas:** Dashboard Empleado, modal Crear solicitud.

**Criterios de aceptación:**
- La tabla muestra únicamente las solicitudes del usuario logueado (filtradas por `employeeId` en el servicio, no en el cliente).
- "Crear solicitud" valida tipo, fechas y motivo antes de enviar; al confirmar, la nueva solicitud aparece en la tabla con estado "Pendiente".
- Los 4 tipos de solicitud son exactamente: Emergencia, Enfermedad, Permiso personal, Otro.

---

### Módulo 4 — `admin-requests`
*Depende de: `shell`.*

**Pantallas:** Dashboard Administrador — Solicitudes.

**Criterios de aceptación:**
- Por defecto se listan las solicitudes en estado "Pendiente" de todo el equipo.
- Aprobar/Denegar actualiza el estado y dispara el envío del correo de notificación (vía el servicio; el contenido del correo lo define el backend).
- Los tabs "Aprobadas / Denegadas / Todas" quedan como **fuera de alcance funcional en esta primera iteración** (se documentan en el mockup como navegación futura) — se implementan cuando se confirme que son necesarios.

---

### Módulo 5 — `admin-users`
*Depende de: `shell`.*

**Pantallas:** Dashboard Administrador — Usuarios, modal Crear usuario, popup Confirmar reseteo de contraseña.

**Criterios de aceptación:**
- Tarjetas de conteo (Total, Activos, Pendientes) calculadas a partir de la lista de usuarios, no hardcodeadas.
- "Editar" y "Resetear contraseña" solo visibles si `estado === 'Activo'`; "Desactivar" visible si Activo; "Activar" visible si Desactivado.
- El mismo botón de "Resetear contraseña" funciona tanto sobre la propia cuenta del admin logueado como sobre cualquier otro usuario (incluyendo otros administradores).
- Crear usuario y Resetear contraseña dejan al usuario en estado "Pendiente" hasta que inicie sesión con la nueva contraseña.

**Contratos de datos:**
```ts
type UserRole = 'Empleado' | 'Administrador';
type UserStatus = 'Pendiente' | 'Activo' | 'Desactivado';

interface User {
  id: string;
  nombre: string;
  correo: string;
  rol: UserRole;
  estado: UserStatus;
}

type RequestType = 'Emergencia' | 'Enfermedad' | 'Permiso personal' | 'Otro';
type RequestStatus = 'Pendiente' | 'Aprobada' | 'Denegada';

interface LeaveRequest {
  id: string;
  employeeId: string;
  tipo: RequestType;
  fechaInicio: string; // ISO 8601
  fechaFin: string;
  motivo: string;
  estado: RequestStatus;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
```

---

## Fuera de alcance de este spec

- Backend (ASP.NET Core, SQL Server) — spec aparte.
- Tabs de filtro "Aprobadas/Denegadas/Todas" en Solicitudes del admin (más allá del layout visual).
- Tests e2e/visuales (Playwright) — se evalúa con backend real.
- Envío real de correos — el frontend solo dispara la acción; el contenido y entrega del correo son responsabilidad del backend.
