# Tasks — MyOwnSpace (Frontend)

> Ver `tasks/plan.md` para overview, decisiones de arquitectura, fases y checkpoints. Este archivo es el detalle accionable de cada tarea.

---

## Fase 0 — Fundaciones

## Task 1: Test runner (Jest + React Testing Library) y `typecheck`

**Description:** El proyecto no tiene test runner. Se agrega Jest vía `next/jest` (soporte oficial de Next.js, sin config manual de babel/webpack) + React Testing Library, y el script `typecheck`.

**Acceptance criteria:**
- [ ] `npm run test` ejecuta Jest y pasa (aunque sea con un test trivial de humo)
- [ ] `npm run test:watch` corre Jest en modo watch
- [ ] `npm run typecheck` ejecuta `tsc --noEmit` sin errores

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: correr `npm run typecheck` en un branch limpio y confirmar exit code 0

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `jest.config.ts`
- `jest.setup.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 2: Tokens de tema (Tailwind dark/light) + `useTheme`

**Description:** Extender `tailwind.config.ts` con `darkMode: 'class'` y tokens semánticos (`bg`, `surface`, `border`, `text`, `text-muted`) con los valores ya validados en el mockup (claro y oscuro). Crear `useTheme` (lee/persiste preferencia en `localStorage`, aplica la clase `dark` al `<html>`).

**Acceptance criteria:**
- [ ] `tailwind.config.ts` tiene `darkMode: 'class'` y los tokens semánticos definidos (no colores hex sueltos en componentes)
- [ ] `useTheme()` expone `{ theme, toggleTheme }` y persiste la elección entre recargas
- [ ] Una página de prueba puede alternar entre claro/oscuro visualmente

**Verification:**
- [ ] Tests pass: `npm run test -- useTheme`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: alternar el toggle en `npm run dev`, recargar la página y confirmar que el tema persiste

**Dependencies:** None

**Files likely touched:**
- `tailwind.config.ts`
- `src/hooks/useTheme.ts`
- `src/styles/globals.css`

**Estimated scope:** Medium: 3-5 files

---

## Task 3: Contratos de datos

**Description:** Crear las interfaces y enums de dominio descritos en `SPEC.md` (`User`, `UserRole`, `UserStatus`, `LeaveRequest`, `RequestType`, `RequestStatus`, `Session`, `LoginPayload`, `SetPasswordPayload`) y los enums de endpoints para solicitudes y usuarios.

**Acceptance criteria:**
- [ ] `UserRole` es exactamente `'Empleado' | 'Administrador'` (SuperAdmin no incluido)
- [ ] `RequestType` es exactamente `'Emergencia' | 'Enfermedad' | 'Permiso personal' | 'Otro'`
- [ ] Ningún tipo usa `any`

**Verification:**
- [ ] Tests pass: N/A (solo tipos, cubierto por `typecheck`)
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: revisar que los nombres de campo coincidan con los usados en el mockup (`estado`, `correo`, `rol`, etc.) para no traducir innecesariamente

**Dependencies:** None

**Files likely touched:**
- `src/contracts/interfaces/user.ts`
- `src/contracts/interfaces/request.ts`
- `src/contracts/interfaces/auth.ts`
- `src/contracts/enums/endpoints/request-endpoints.ts`
- `src/contracts/enums/endpoints/user-endpoints.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 4: Capa de mocks tipada

**Description:** Crear fixtures en memoria (usuarios y solicitudes de ejemplo, coherentes con los del mockup: Julio Pérez y Laura Sánchez como Administradores, Ana Martínez/Carlos Rivas/Sofía Nuñez/Marta Gómez como Empleados) y un adaptador que implementa las mismas firmas que tendrán `auth.api.ts`, `requests.api.ts` y `users.api.ts`, con latencia simulada.

**Acceptance criteria:**
- [ ] `mock-data.ts` exporta arrays tipados de `User[]` y `LeaveRequest[]`
- [ ] `mock-adapter.ts` expone funciones con la misma forma que las futuras llamadas reales (mismo nombre, mismos parámetros, misma promesa de retorno)
- [ ] Ningún componente importa `mocks/` directamente (solo los `*.api.ts` lo hacen)

**Verification:**
- [ ] Tests pass: `npm run test -- mocks`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: revisar que los datos de ejemplo coincidan con los usados en el mockup de Claude Design, para que la demo se sienta consistente

**Dependencies:** Task 3

**Files likely touched:**
- `src/services/mocks/mock-data.ts`
- `src/services/mocks/mock-adapter.ts`

**Estimated scope:** Medium: 3-5 files

---

## Fase 1 — Módulo `auth`

## Task 5: `lib/password-rules.ts`

**Description:** Implementar los 6 requisitos de contraseña definidos en `OwnSpace.md` y el mockup: mínimo 10 caracteres, mayúscula, minúscula, número, carácter especial, y no ser una contraseña genérica/la temporal recibida. Exportar como lista de reglas evaluables (para reusar tanto en el checklist visual como en la validación zod).

**Acceptance criteria:**
- [ ] Cada regla es una función pura `(password: string) => boolean`
- [ ] La regla "no genérica" compara contra una lista mínima de contraseñas comunes bloqueadas (ej. `Password123!`) y, cuando se provee, contra la contraseña temporal/actual del usuario
- [ ] `npm run test -- password-rules` cubre cada regla individualmente (casos que pasan y que fallan)

**Verification:**
- [ ] Tests pass: `npm run test -- password-rules`
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: N/A (cubierto por unit tests)

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/password-rules.ts`
- `src/lib/password-rules.test.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 6: Login

**Description:** Reescribir `LoginForm`/`useLoginForm`/`login.tsx` para que validen con zod, llamen a `auth.api.login()` (mock-backed), muestren error de credenciales inválidas, incluyan el toggle de modo oscuro/claro y el enlace "¿Olvidaste tu contraseña?", igualando el mockup validado (logo, tarjeta centrada, inputs con borde/foco, botón turquesa, copyright "© DevTech 2026" al pie).

**Acceptance criteria:**
- [ ] Envío con datos inválidos (email mal formado, campos vacíos) muestra error de validación sin llamar al servicio
- [ ] Login exitoso contra un usuario del mock redirige a `/` (Empleado) o `/admin/requests` (Administrador) según el rol devuelto
- [ ] Login con credenciales que no existen en el mock muestra un mensaje de error genérico (no confirma si el correo existe)
- [ ] El toggle de tema y el footer de copyright están presentes

**Verification:**
- [ ] Tests pass: `npm run test -- LoginForm`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar visualmente contra el artboard "Inicio de sesión" del mockup publicado, en ambos temas

**Dependencies:** Tasks 2, 4, 5

**Files likely touched:**
- `src/pages/login.tsx`
- `src/components/pages/login/LoginForm.tsx`
- `src/components/pages/login/useLoginForm.ts`
- `src/services/auth/auth.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 7: Olvidé mi contraseña

**Description:** Construir `/forgot-password` (formulario de correo) y su estado de confirmación, llamando a `auth.api.forgotPassword()`. El mensaje de confirmación es siempre el mismo, exista o no el correo en el sistema.

**Acceptance criteria:**
- [ ] Envío válido de correo (formato) siempre navega al estado de confirmación, sin importar si el correo existe en el mock
- [ ] El mensaje de confirmación no revela si el correo está registrado
- [ ] Enlace "Volver a inicio de sesión" funcional en ambas pantallas

**Verification:**
- [ ] Tests pass: `npm run test -- forgot-password`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar contra los artboards "Olvidé mi contraseña" y "Correo enviado" del mockup

**Dependencies:** Tasks 2, 4

**Files likely touched:**
- `src/pages/forgot-password.tsx` (o `forgot-password/index.tsx` + `sent.tsx`)
- `src/components/pages/forgot-password/`
- `src/services/auth/auth.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 8: Definir nueva contraseña

**Description:** Construir `/set-password` (recibe un token por query param, simulado contra el mock) con los dos campos de contraseña y el checklist en vivo de `lib/password-rules.ts`. El botón "Guardar contraseña" queda deshabilitado hasta que los 6 requisitos se cumplan y ambos campos coincidan.

**Acceptance criteria:**
- [ ] El checklist refleja en tiempo real cada requisito mientras se escribe
- [ ] "Guardar contraseña" está deshabilitado si falta algún requisito o si las contraseñas no coinciden
- [ ] Al guardar exitosamente, el usuario queda en estado `Activo` en el mock y es redirigido al login (o auto-logueado, a decidir en la implementación)
- [ ] Aplica igual para usuarios con rol Empleado o Administrador (sin lógica condicional por rol)

**Verification:**
- [ ] Tests pass: `npm run test -- set-password`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar contra el artboard "Definir nueva contraseña" del mockup, probando ambos estados del switch `passwordValid`

**Dependencies:** Tasks 2, 4, 5

**Files likely touched:**
- `src/pages/set-password.tsx`
- `src/components/pages/set-password/`
- `src/services/auth/auth.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 9: Expiración de sesión (2h) + página 404

**Description:** Extender `with-auth.tsx` para expirar la sesión tras 2 horas de inactividad (redirigiendo a `/login?expired=1`) y para devolver 404 (no un mensaje de "sin permiso") cuando la ruta no existe o el rol no alcanza. Conectar el banner de "sesión expirada" en Login al query param. Crear `pages/404.tsx` con el diseño del mockup.

**Acceptance criteria:**
- [ ] Sin token válido, cualquier ruta protegida redirige a `/login`
- [ ] Con token expirado (simulado), redirige a `/login?expired=1` y el banner correspondiente se muestra
- [ ] Ruta inexistente, o ruta que el rol actual no puede ver, siempre renderiza `404.tsx` con mensaje genérico — nunca un mensaje que confirme "existe pero no tenés acceso"

**Verification:**
- [ ] Tests pass: `npm run test -- with-auth`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: navegar a una ruta de Administrador logueado como Empleado y confirmar que se ve el 404, no un error distinto

**Dependencies:** Tasks 4, 6

**Files likely touched:**
- `src/middlewares/with-auth.tsx`
- `src/pages/404.tsx`
- `src/components/pages/login/LoginForm.tsx`

**Estimated scope:** Medium: 3-5 files

---

### Checkpoint: `auth` completo
- [ ] Flujo completo probado a mano: login válido/inválido, olvidé mi contraseña, definir contraseña, sesión expirada, ruta inexistente → 404
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` sin errores
- [ ] Revisar con el usuario antes de continuar

---

## Fase 2 — Módulo `shell`

## Task 10: `AppShell` + `Topbar`

**Description:** Construir el armazón de las pantallas autenticadas: `AppShell` (envuelve topbar + sidebar + contenido) y `Topbar` (logo, `ThemeToggle`, dropdown con Perfil / Cambiar contraseña / Cerrar sesión), igualando el mockup.

**Acceptance criteria:**
- [ ] "Cambiar contraseña" en el dropdown dispara el mismo flujo/modal de confirmación que "Resetear contraseña" del admin, aplicado a la propia cuenta
- [ ] "Cerrar sesión" limpia la sesión y redirige a `/login`
- [ ] El nombre y rol mostrados en el topbar vienen de `useSession`, no hardcodeados

**Verification:**
- [ ] Tests pass: `npm run test -- Topbar`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar contra el topbar de los artboards de dashboard del mockup

**Dependencies:** Tasks 2, 6

**Files likely touched:**
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/layout/ThemeToggle.tsx`

**Estimated scope:** Medium: 3-5 files

---

## Task 11: `Sidebar` por rol

**Description:** Construir `Sidebar`, cuyo contenido depende del rol de la sesión: Empleado ve "Crear solicitud" + "Cerrar sesión"; Administrador ve navegación "Solicitudes" / "Usuarios" + "Cerrar sesión".

**Acceptance criteria:**
- [ ] El contenido del sidebar cambia correctamente según `Session.rol`
- [ ] El ítem activo (según la ruta actual) se resalta visualmente, igual que en el mockup

**Verification:**
- [ ] Tests pass: `npm run test -- Sidebar`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: entrar como Empleado y como Administrador (mock) y confirmar que cada uno ve su propio sidebar

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/layout/Sidebar.tsx`

**Estimated scope:** Small: 1-2 files

---

## Task 12: `useSession`

**Description:** Hook que expone el usuario/rol actual a partir de la sesión resuelta server-side por `with-auth.tsx`, para que `Topbar`/`Sidebar`/páginas lo consuman sin prop-drilling manual.

**Acceptance criteria:**
- [ ] `useSession()` devuelve `{ userId, nombre, rol, estado }` tipado como `Session`
- [ ] No hace ninguna llamada de red propia — solo lee lo que `getServerSideProps` ya resolvió

**Verification:**
- [ ] Tests pass: `npm run test -- useSession`
- [ ] Build succeeds: `npm run typecheck`
- [ ] Manual check: N/A

**Dependencies:** Tasks 3, 9

**Files likely touched:**
- `src/hooks/useSession.ts`

**Estimated scope:** Small: 1-2 files

---

### Checkpoint: `shell` completo
- [ ] Empleado ve sidebar de Empleado; Administrador ve sidebar de Administrador
- [ ] "Cambiar contraseña" desde el dropdown dispara el mismo flujo de confirmación que "Resetear contraseña"
- [ ] Revisar con el usuario antes de continuar

---

## Fase 3 — Módulos de negocio

*Tareas 13-14, 15-16 y 17-20 son paralelizables entre sí (no entre ellas mismas) una vez completado el checkpoint de `shell`.*

## Task 13: Dashboard Empleado — tabla de solicitudes

**Description:** Reescribir `pages/index.tsx` para mostrar `RequestsTable` con las solicitudes del usuario logueado (filtradas por `employeeId` en el servicio), igualando el mockup: columnas Tipo/Fecha/Motivo/Estado con badges de color por estado.

**Acceptance criteria:**
- [ ] La tabla solo muestra solicitudes del `userId` de la sesión actual
- [ ] Cada estado (`Pendiente`/`Aprobada`/`Denegada`) tiene el color de badge correspondiente al mockup
- [ ] Estado vacío (sin solicitudes) muestra un mensaje, no una tabla en blanco

**Verification:**
- [ ] Tests pass: `npm run test -- RequestsTable`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar contra el artboard "Empleado — Dashboard"

**Dependencies:** Tasks 4, 11, 12

**Files likely touched:**
- `src/pages/index.tsx`
- `src/components/pages/employee/RequestsTable.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 14: Modal "Crear solicitud"

**Description:** Construir `CreateRequestModal` con los campos Tipo (los 4 valores exactos), Fecha desde/hasta, Motivo, validados con zod, llamando a `requests.api.create()`. Al confirmar, la tabla del dashboard se actualiza con la nueva solicitud en estado `Pendiente`.

**Acceptance criteria:**
- [ ] Los 4 tipos de solicitud disponibles son exactamente: Emergencia, Enfermedad, Permiso personal, Otro
- [ ] Fecha "hasta" no puede ser anterior a "desde" (validación de formulario)
- [ ] Tras crear, la nueva solicitud aparece en la tabla sin recargar la página

**Verification:**
- [ ] Tests pass: `npm run test -- CreateRequestModal`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: crear una solicitud de cada tipo y confirmar que aparece correctamente

**Dependencies:** Task 13

**Files likely touched:**
- `src/components/pages/employee/CreateRequestModal.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 15: Dashboard Admin — Solicitudes pendientes

**Description:** Construir `pages/admin/requests.tsx` con `RequestsTable` (variante admin: columna Empleado + acciones), mostrando por defecto las solicitudes en estado `Pendiente` de todo el equipo.

**Acceptance criteria:**
- [ ] Por defecto se listan solo las solicitudes `Pendiente`
- [ ] Los tabs "Aprobadas/Denegadas/Todas" se renderizan visualmente pero no filtran todavía (documentado como fuera de alcance funcional en `SPEC.md`)

**Verification:**
- [ ] Tests pass: `npm run test -- admin/RequestsTable`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar contra el artboard "Administrador — Solicitudes"

**Dependencies:** Tasks 4, 11, 12

**Files likely touched:**
- `src/pages/admin/requests.tsx`
- `src/components/pages/admin/RequestsTable.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 16: Acciones Aprobar/Denegar

**Description:** Conectar los botones "Aprobar"/"Denegar" de cada fila a `requests.api.approve()` / `requests.api.deny()`. Al confirmar, la fila desaparece de la vista de Pendientes (o cambia de estado) sin recargar la página.

**Acceptance criteria:**
- [ ] "Aprobar" cambia el estado a `Aprobada` y registra `reviewedBy`/`reviewedAt`
- [ ] "Denegar" cambia el estado a `Denegada` con el mismo registro
- [ ] La fila se retira de la lista de Pendientes tras la acción

**Verification:**
- [ ] Tests pass: `npm run test -- admin/RequestsTable`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: aprobar una solicitud y denegar otra, confirmar que ambas salen de Pendientes

**Dependencies:** Task 15

**Files likely touched:**
- `src/components/pages/admin/RequestsTable.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 17: Dashboard Admin — Usuarios (tabla + contadores)

**Description:** Construir `pages/admin/users.tsx` con las 3 tarjetas de conteo (Total/Activos/Pendientes, calculadas del dato real, no hardcodeadas) y `UsersTable` con avatar/nombre/correo, rol, estado y acciones condicionales según estado.

**Acceptance criteria:**
- [ ] Los contadores se recalculan a partir de la lista de usuarios del mock
- [ ] "Editar" y "Resetear contraseña" solo visibles si `estado === 'Activo'`
- [ ] "Desactivar" visible si `Activo`; "Activar" visible si `Desactivado`
- [ ] El usuario logueado se identifica con la etiqueta "TÚ" en su propia fila

**Verification:**
- [ ] Tests pass: `npm run test -- UsersTable`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: comparar contra el artboard "Administrador — Usuarios"

**Dependencies:** Tasks 4, 11, 12

**Files likely touched:**
- `src/pages/admin/users.tsx`
- `src/components/pages/admin/UsersTable.tsx`
- `src/services/users/users.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 18: Modal "Crear usuario"

**Description:** Construir `CreateUserModal` (Nombre, Correo, Rol) validado con zod, llamando a `users.api.create()`. El nuevo usuario queda en estado `Pendiente`.

**Acceptance criteria:**
- [ ] Rol solo permite `Empleado` o `Administrador` (no SuperAdmin)
- [ ] Tras crear, el usuario aparece en la tabla con estado `Pendiente`
- [ ] Correo duplicado (ya existente en el mock) muestra error de validación

**Verification:**
- [ ] Tests pass: `npm run test -- CreateUserModal`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: crear un usuario y confirmarlo en la tabla y en los contadores

**Dependencies:** Task 17

**Files likely touched:**
- `src/components/pages/admin/CreateUserModal.tsx`
- `src/services/users/users.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 19: Editar usuario

**Description:** Conectar la acción "Editar" a un formulario (modal o inline, a definir en implementación) que permite modificar nombre, correo y rol de un usuario existente, llamando a `users.api.update()`.

**Acceptance criteria:**
- [ ] Los cambios se reflejan en la tabla sin recargar la página
- [ ] Rol sigue restringido a `Empleado` | `Administrador`

**Verification:**
- [ ] Tests pass: `npm run test -- UsersTable`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: editar el nombre de un usuario y confirmar que se actualiza en la tabla

**Dependencies:** Task 17

**Files likely touched:**
- `src/components/pages/admin/UsersTable.tsx` (o un nuevo `EditUserModal.tsx`)
- `src/services/users/users.api.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 20: Resetear contraseña + Activar/Desactivar

**Description:** Construir `ResetPasswordConfirmModal` (Sí/No), reutilizado tanto para resetear la propia contraseña del admin logueado como la de cualquier otro usuario. Conectar "Activar"/"Desactivar" a `users.api.toggleStatus()`.

**Acceptance criteria:**
- [ ] El popup funciona igual sobre la propia fila del admin logueado (con etiqueta "TÚ") y sobre cualquier otro usuario, incluyendo otros administradores
- [ ] Confirmar reseteo deja al usuario en estado `Pendiente`
- [ ] Desactivar/Activar cambia el estado y las acciones disponibles de esa fila se actualizan de inmediato

**Verification:**
- [ ] Tests pass: `npm run test -- ResetPasswordConfirmModal`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: resetear la propia contraseña del admin de prueba y la de otro usuario; desactivar y reactivar un usuario

**Dependencies:** Task 17

**Files likely touched:**
- `src/components/pages/admin/ResetPasswordConfirmModal.tsx`
- `src/services/users/users.api.ts`

**Estimated scope:** Medium: 3-5 files

---

### Checkpoint: Módulos de negocio completos
- [ ] Los 3 flujos de punta a punta funcionan contra mocks: empleado crea solicitud → admin la aprueba/deniega; admin crea usuario → usuario queda Pendiente → define contraseña → pasa a Activo
- [ ] Revisión visual contra el mockup publicado (luz y oscuro)
- [ ] Revisar con el usuario antes de continuar

---

## Fase 4 — Limpieza

## Task 21: Eliminar scaffolding sin uso

**Description:** Quitar `pages/api/hello.ts` y cualquier otro archivo de plantilla sin uso real (revisar `TextInput.tsx` si terminó sin consumidores, `.gitkeep` ya reemplazados por archivos reales). Pase final de `lint` + `typecheck` sobre todo el proyecto.

**Acceptance criteria:**
- [ ] `npm run lint` y `npm run typecheck` sin errores ni warnings nuevos
- [ ] No quedan archivos de ejemplo de `create-next-app` sin uso

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: `git status` limpio, sin archivos huérfanos

**Dependencies:** Tasks 6-20 (todas las de negocio)

**Files likely touched:**
- `src/pages/api/hello.ts` (eliminar)
- otros según lo encontrado

**Estimated scope:** Small: 1-2 files

---

## Task 22: QA visual contra el mockup

**Description:** Recorrer las 11 pantallas del mockup publicado (Claude Design) una por una, comparando contra la implementación real en `npm run dev`, en modo claro y oscuro, y corrigiendo discrepancias encontradas.

**Acceptance criteria:**
- [ ] Cada pantalla implementada coincide con su artboard correspondiente (colores, espaciados, copy) en ambos temas
- [ ] Discrepancias encontradas quedan corregidas o documentadas explícitamente como decisión consciente

**Verification:**
- [ ] Tests pass: `npm run test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: recorrido pantalla por pantalla, documentado en la conversación o en un comentario de PR

**Dependencies:** Task 21

**Files likely touched:** variable, según lo encontrado

**Estimated scope:** Small: 1-2 files (por corrección puntual)
