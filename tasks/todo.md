# Tasks — MyOwnSpace (Frontend)

> Ver `tasks/plan.md` para overview, decisiones de arquitectura, fases y checkpoints. Este archivo es el detalle accionable de cada tarea.

---

## Fase 0 — Fundaciones

## Task 1: Test runner (Jest + React Testing Library) y `typecheck` ✅

**Description:** El proyecto no tiene test runner. Se agrega Jest vía `next/jest` (soporte oficial de Next.js, sin config manual de babel/webpack) + React Testing Library, y el script `typecheck`.

**Acceptance criteria:**
- [x] `npm run test` ejecuta Jest y pasa (aunque sea con un test trivial de humo)
- [x] `npm run test:watch` corre Jest en modo watch
- [x] `npm run typecheck` ejecuta `tsc --noEmit` sin errores

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Build succeeds: `npm run build`
- [x] Manual check: `npm run typecheck` (exit 0) y `npm run lint` (sin warnings)

**Nota:** `typecheck` reveló un bug preexistente en `TextInput.tsx` (usaba `Field`/`ErrorMessage`/`floatingLabel`, nunca definidos — no compilaba). Se corrigió como parte de esta tarea porque bloqueaba la verificación: `Field` → `input`, se agregó el prop `label` que faltaba en la interfaz, y se quitó el bloque `<ErrorMessage>` duplicado (el manejo de error manual ya existente cubre lo mismo).

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `jest.config.ts`
- `jest.setup.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 2: Tokens de tema (Tailwind dark/light) + `useTheme` ✅

**Description:** Extender `tailwind.config.ts` con `darkMode: 'class'` y tokens semánticos (`bg`, `surface`, `border`, `text`, `text-muted` — implementados como `background`, `surface`, `surface-field`, `border`, `foreground`, `muted` para evitar clases ambiguas como `bg-bg`/`text-text`) con los valores ya validados en el mockup (claro y oscuro). Crear `useTheme` (lee/persiste preferencia en `localStorage`, aplica la clase `dark` al `<html>`).

**Acceptance criteria:**
- [x] `tailwind.config.ts` tiene `darkMode: 'class'` y los tokens semánticos definidos (no colores hex sueltos en componentes)
- [x] `useTheme()` expone `{ theme, toggleTheme }` y persiste la elección entre recargas
- [x] Una página de prueba puede alternar entre claro/oscuro visualmente — **parcial, ver nota**

**Verification:**
- [x] Tests pass: `npm run test -- useTheme` (4 tests: default claro, preferencia de sistema, toggle + persistencia, localStorage por encima del sistema)
- [x] Build succeeds: `npm run build`
- [x] Manual check: `npm run dev`, confirmado que `/login` responde 200 con el script anti-parpadeo embebido en el HTML, sin errores de runtime

**Nota:** todavía ningún componente consume los tokens (`ThemeToggle` es la Tarea 10), así que no hay una pantalla real donde alternar colores visualmente todavía — la verificación visual completa queda pendiente para cuando se construya el `ThemeToggle`/`AppShell` (Tarea 10) y el QA visual final (Tarea 22). Lo verificado acá es la lógica (tests unitarios) y que no rompe el render de páginas existentes. También se agregó un script inline en `_document.tsx` (no estaba en el listado original de archivos) para evitar el parpadeo de tema al cargar, leyendo la misma clave de `localStorage` que usa `useTheme`.

**Dependencies:** None

**Files likely touched:**
- `tailwind.config.ts`
- `src/hooks/useTheme.ts`
- `src/styles/globals.css`

**Estimated scope:** Medium: 3-5 files

---

## Task 3: Contratos de datos ✅

**Description:** Crear las interfaces y enums de dominio descritos en `SPEC.md` (`User`, `UserRole`, `UserStatus`, `LeaveRequest`, `RequestType`, `RequestStatus`, `Session`, `LoginPayload`, `SetPasswordPayload`) y los enums de endpoints para solicitudes y usuarios.

**Acceptance criteria:**
- [x] `UserRole` es exactamente `'Empleado' | 'Administrador'` (SuperAdmin no incluido)
- [x] `RequestType` es exactamente `'Emergencia' | 'Enfermedad' | 'Permiso personal' | 'Otro'`
- [x] Ningún tipo usa `any`

**Verification:**
- [x] Tests pass: N/A (solo tipos, cubierto por `typecheck`) — suite completa sigue en 5/5
- [x] Build succeeds: `npm run typecheck` y `npm run build`
- [x] Manual check: nombres de campo revisados contra el mockup (`estado`, `correo`, `rol`, `nombre`) — coinciden

**Nota:** además de `LoginPayload`/`Session`/`SetPasswordPayload` (los del ejemplo de `SPEC.md`), se agregó `ForgotPasswordPayload` en `auth.ts` — necesario para la Tarea 7 y trivial, no un contrato nuevo fuera de lo ya acordado. Se eliminó `src/contracts/interfaces/.gitkeep`, ya innecesario con archivos reales en la carpeta.

**Dependencies:** None

**Files likely touched:**
- `src/contracts/interfaces/user.ts`
- `src/contracts/interfaces/request.ts`
- `src/contracts/interfaces/auth.ts`
- `src/contracts/enums/endpoints/request-endpoints.ts`
- `src/contracts/enums/endpoints/user-endpoints.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 4: Capa de mocks tipada ✅

**Description:** Crear fixtures en memoria (usuarios y solicitudes de ejemplo, coherentes con los del mockup: Julio Pérez y Laura Sánchez como Administradores, Ana Martínez/Carlos Rivas/Sofía Nuñez/Marta Gómez como Empleados) y un adaptador que implementa las mismas firmas que tendrán `auth.api.ts`, `requests.api.ts` y `users.api.ts`, con latencia simulada.

**Acceptance criteria:**
- [x] `mock-data.ts` exporta arrays tipados de `User[]` y `LeaveRequest[]`
- [x] `mock-adapter.ts` expone funciones con la misma forma que las futuras llamadas reales (mismo nombre, mismos parámetros, misma promesa de retorno)
- [x] Ningún componente importa `mocks/` directamente (nada la importa todavía — se conectará desde los `*.api.ts` en las tareas 6-20)

**Verification:**
- [x] Tests pass: `npm run test -- mocks` (16/16; suite completa 21/21)
- [x] Build succeeds: `npm run build`
- [x] Manual check: usuarios y solicitudes de ejemplo revisados contra el mockup (mismos nombres/correos/roles/motivos)

**Contrato definido** (queda como la firma a implementar en las tareas 6-20):
- `mockAuthAdapter`: `login`, `forgotPassword`, `setPassword`
- `mockRequestsAdapter`: `listByEmployee`, `listPending`, `create`, `approve`, `deny`
- `mockUsersAdapter`: `list`, `create`, `update`, `resetPassword`, `toggleStatus`

**Nota:** se agregaron `CreateUserPayload`/`UpdateUserPayload` a `contracts/interfaces/user.ts` y `CreateLeaveRequestPayload` a `request.ts` — necesarios para tipar el adaptador, dentro del mismo alcance que la Tarea 3 ("contratos de datos"). También se agregó `resetMockState()`, exportado solo para que los tests partan de un estado limpio (el store en memoria es mutable entre llamadas, a propósito, para simular persistencia dentro de una sesión).

**Dependencies:** Task 3

**Files likely touched:**
- `src/services/mocks/mock-data.ts`
- `src/services/mocks/mock-adapter.ts`

**Estimated scope:** Medium: 3-5 files

---

## Fase 1 — Módulo `auth`

## Task 5: `lib/password-rules.ts` ✅

**Description:** Implementar los 6 requisitos de contraseña definidos en `OwnSpace.md` y el mockup: mínimo 10 caracteres, mayúscula, minúscula, número, carácter especial, y no ser una contraseña genérica/la temporal recibida. Exportar como lista de reglas evaluables (para reusar tanto en el checklist visual como en la validación zod).

**Acceptance criteria:**
- [x] Cada regla es una función pura `(password: string, context?: PasswordRuleContext) => boolean`
- [x] La regla "no genérica" compara contra una lista mínima de contraseñas comunes bloqueadas (ej. `Password123!`) y, cuando se provee, contra la contraseña temporal/actual del usuario (`context.passwordActual`)
- [x] `npm run test -- password-rules` cubre cada regla individualmente (casos que pasan y que fallan)

**Verification:**
- [x] Tests pass: `npm run test -- password-rules` (11/11; suite completa 32/32)
- [x] Build succeeds: `npm run typecheck`, `npm run build`
- [x] Manual check: N/A (cubierto por unit tests)

**Nota:** además de `passwordRules` y `isPasswordValid`, se agregó `evaluatePasswordRules()` (devuelve `{id, label, met}[]`) — es exactamente lo que va a consumir el checklist visual de la Tarea 8, evita que ese componente reimplemente el mapeo.

**Dependencies:** Task 1

**Files likely touched:**
- `src/lib/password-rules.ts`
- `src/lib/password-rules.test.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 6: Login ✅

**Description:** Reescribir `LoginForm`/`useLoginForm`/`login.tsx` para que validen con zod, llamen a `auth.api.login()` (mock-backed), muestren error de credenciales inválidas, incluyan el toggle de modo oscuro/claro y el enlace "¿Olvidaste tu contraseña?", igualando el mockup validado (logo, tarjeta centrada, inputs con borde/foco, botón turquesa, copyright "© DevTech 2026" al pie).

**Acceptance criteria:**
- [x] Envío con datos inválidos (email mal formado, campos vacíos) muestra error de validación sin llamar al servicio
- [x] Login exitoso contra un usuario del mock redirige a `/` (Empleado) o `/admin/requests` (Administrador) según el rol devuelto
- [x] Login con credenciales que no existen en el mock muestra un mensaje de error genérico (no confirma si el correo existe)
- [x] El toggle de tema y el footer de copyright están presentes

**Verification:**
- [x] Tests pass: `npm run test -- LoginForm` (8/8; suite completa 48/48)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real + `curl` con cookie de sesión simulada — confirmado que sin sesión `/` rebota a `/login` (307) y con sesión `/` responde 200 y `/login` redirige a `/`. No se pudo comparar visualmente pixel a pixel contra el artboard (sin herramienta de navegador en este entorno) — queda para el QA visual de la Tarea 22.

**Notas / desvíos del alcance original, todos necesarios para que el criterio de aceptación fuera real y no solo aparente:**
- **`refresh-session.ts` reescrito** (no estaba en la lista de archivos): antes llamaba a un backend real inexistente vía axios, lo que habría hecho que el "redirige a /" nunca funcionara de verdad (rebote infinito a login). Ahora lee la sesión directamente de la cookie `accessToken` (JSON), que es la que `auth.api.login()` graba. `with-auth.tsx` no cambió — sigue recibiendo `Session | null` igual que antes.
- **`ThemeToggle.tsx` construido ahora** (era de la Tarea 10): el login necesitaba un control de tema real y funcional ya (regla de `OwnSpace.md`: "modo oscuro desde el inicio de sesión"), no solo el tweak del mockup. Queda en `components/layout/` para que la Tarea 10 lo reuse en el Topbar en vez de duplicarlo.
- **`TextInput.tsx` corregido**: además del fix de compilación de la Tarea 1, tenía colores rotos (`bg-dark-50`/`text-light-50`, inexistentes) y un `onChange` que se destructuraba y se tiraba (nunca llegaba al `<input>` real). Se migró a los tokens semánticos de la Tarea 2 y se dejó que `onChange` fluya con el resto de props.
- **`jest.setup.ts`**: se agregó un polyfill global de `window.matchMedia` (jsdom no lo implementa) para que cualquier test que renderice un componente con `useTheme` funcione sin mockearlo caso por caso.

**Dependencies:** Tasks 2, 4, 5

**Files likely touched:**
- `src/pages/login.tsx`
- `src/components/pages/login/LoginForm.tsx`
- `src/components/pages/login/useLoginForm.ts`
- `src/services/auth/auth.api.ts`

**Estimated scope:** Medium: 3-5 files (terminó tocando 9 por las razones de arriba)

---

## Task 7: Olvidé mi contraseña ✅

**Description:** Construir `/forgot-password` (formulario de correo) y su estado de confirmación, llamando a `auth.api.forgotPassword()`. El mensaje de confirmación es siempre el mismo, exista o no el correo en el sistema.

**Acceptance criteria:**
- [x] Envío válido de correo (formato) siempre navega al estado de confirmación, sin importar si el correo existe en el mock
- [x] El mensaje de confirmación no revela si el correo está registrado
- [x] Enlace "Volver a inicio de sesión" funcional en ambas pantallas

**Verification:**
- [x] Tests pass: `npm run test -- forgot-password` (7/7; suite completa 55/55)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — `/forgot-password` y `/forgot-password/sent?correo=...` responden 200, y la confirmación refleja el correo real recibido por query string

**Nota:** el correo se pasa de una pantalla a otra por query string (`?correo=...`), ya que todavía no hay un store/contexto compartido en la app — es la forma más simple dado el alcance actual. `auth.api.forgotPassword()` ya existía desde la Tarea 6 (se construyeron las 3 funciones de auth juntas), así que no hubo que tocar `auth.api.ts` de nuevo.

**Dependencies:** Tasks 2, 4

**Files likely touched:**
- `src/pages/forgot-password.tsx` (o `forgot-password/index.tsx` + `sent.tsx`)
- `src/components/pages/forgot-password/`
- `src/services/auth/auth.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 8: Definir nueva contraseña ✅

**Description:** Construir `/set-password` (recibe un token por query param, simulado contra el mock) con los dos campos de contraseña y el checklist en vivo de `lib/password-rules.ts`. El botón "Guardar contraseña" queda deshabilitado hasta que los 6 requisitos se cumplan y ambos campos coincidan.

**Acceptance criteria:**
- [x] El checklist refleja en tiempo real cada requisito mientras se escribe
- [x] "Guardar contraseña" está deshabilitado si falta algún requisito o si las contraseñas no coinciden
- [x] Al guardar exitosamente, el usuario queda en estado `Activo` en el mock y es redirigido al login — se decidió: siempre redirige a `/login` sin auto-loguear (patrón más seguro/estándar tras un cambio de contraseña)
- [x] Aplica igual para usuarios con rol Empleado o Administrador (sin lógica condicional por rol — el formulario no consulta el rol en ningún momento)

**Verification:**
- [x] Tests pass: `npm run test -- SetPasswordForm` (7/7; suite completa 63/63)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — `/set-password?token=u5` responde 200 y renderiza el formulario correctamente; `/login` sigue funcionando sin romperse

**Nota importante:** `mockAuthAdapter.setPassword` era un stub que no hacía nada (Tarea 4). Para que "el usuario queda Activo" fuera real, se le agregó lógica: sin backend, el mock trata el `token` directamente como el id del usuario (`/set-password?token=u5` = Sofía Nuñez). Esto actualizó dos tests preexistentes en `mock-adapter.test.ts` y `auth.api.test.ts` que usaban tokens inventados — ahora usan `'u5'` y verifican el cambio de estado real. La regla "no debe ser la contraseña actual/temporal" de `password-rules.ts` no se aplica en este mock (no hay dónde consultar la contraseña temporal real de un usuario sin backend) — sí se aplica el bloqueo contra la lista de contraseñas genéricas conocidas.

**Incidente aparte, no relacionado al código:** al correr `npm run build` con el servidor de `npm run dev` todavía activo, ambos escribieron sobre la misma carpeta `.next` y la corrompieron (error 500 "Cannot find module"). Se resolvió matando el proceso y borrando `.next` antes de reiniciar — no es un bug de la app, pero vale tenerlo presente: no correr build y dev en simultáneo sobre el mismo `.next`.

**Dependencies:** Tasks 2, 4, 5

**Files likely touched:**
- `src/pages/set-password.tsx`
- `src/components/pages/set-password/`
- `src/services/auth/auth.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 9: Expiración de sesión (2h) + página 404 ✅

**Description:** Extender `with-auth.tsx` para expirar la sesión tras 2 horas de inactividad (redirigiendo a `/login?expired=1`) y para devolver 404 (no un mensaje de "sin permiso") cuando la ruta no existe o el rol no alcanza. Conectar el banner de "sesión expirada" en Login al query param. Crear `pages/404.tsx` con el diseño del mockup.

**Acceptance criteria:**
- [x] Sin token válido, cualquier ruta protegida redirige a `/login`
- [x] Con token expirado (simulado), redirige a `/login?expired=1` y el banner correspondiente se muestra
- [x] Ruta inexistente, o ruta que el rol actual no puede ver, siempre renderiza `404.tsx` con mensaje genérico — nunca un mensaje que confirme "existe pero no tenés acceso"

**Verification:**
- [x] Tests pass: `npm run test -- with-auth` (8/8; suite completa 81/81, incluyendo `session-cookie` y `404`/`NotFoundPage`)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real —
  - Sin cookie: `/` → 307 a `/login`.
  - Cookie con `expiresAt` vencido: `/` → 307 a `/login?expired=1`, y esa URL efectivamente muestra el aviso amarillo.
  - Cookie válida: `/` → 200, y la respuesta trae `Set-Cookie` renovando `expiresAt` +2h (sesión por inactividad, no por plazo fijo).
  - Ruta inexistente (`/ruta-que-no-existe`) → 404 con el contenido esperado.
  - **No verificado a mano:** "ruta de Administrador logueado como Empleado → 404 por rol" — no existe todavía ninguna ruta que pase `{roles:['Administrador']}` a `withAuth` (eso es la Tarea 15). La lógica está implementada y cubierta por 2 de los 8 tests de `with-auth.test.ts`; la verificación en navegador real queda pendiente para cuando esa ruta exista.

**Cambios más profundos de lo previsto, todos necesarios:**
- **`refresh-session.ts` reescrito de nuevo**: antes devolvía `Session | null`, lo cual no alcanza para distinguir "nunca inició sesión" de "sesión vencida por inactividad" — ambos casos lucían iguales. Ahora devuelve un resultado de 3 estados (`'none' | 'expired' | 'valid'`) y, en cada verificación válida, **renueva** la cookie (+2h desde ahora) — así es una expiración por inactividad real, no un plazo fijo.
- **`session-cookie.ts` (nuevo módulo)**: centraliza el nombre de la cookie, el TTL de la sesión (2h), el maxAge técnico del cookie (30 días — mucho mayor al TTL funcional, a propósito: si el navegador lo borrara a las 2h justas, perderíamos la forma de distinguir "vencida" de "nunca existió") y el encode/decode del JSON con `expiresAt`. Lo usan tanto `auth.api.ts` (al loguear) como `refresh-session.ts` (al verificar y renovar).
- **`with-auth.tsx`**: agregó la opción `roles?: UserRole[]` — cualquier página puede ahora restringirse por rol devolviendo `{ notFound: true }` (el mecanismo nativo de Next.js para 404, no un redirect a una URL `/404`).
- **`pages/404.tsx` reestructurado**: originalmente escribí el contenido directo ahí, pero **Next.js trata cualquier archivo dentro de `pages/` como una ruta** — mi primer intento de test (`pages/404.test.tsx`) rompió `npm run build` (`ReferenceError: describe is not defined`, porque Next.js intentó compilarlo como página `/404.test`). Se corrigió moviendo el contenido a `components/pages/not-found/NotFoundPage.tsx` (con su test al lado, fuera de `pages/`), dejando `pages/404.tsx` como wrapper delgado — igual al resto de páginas del proyecto. **Lección para tareas futuras: nunca poner archivos `.test.tsx` dentro de `src/pages/`.**
- Como en la Tarea 8, hubo que reiniciar el servidor de dev y borrar `.next` una vez más por correr `build` con `dev` activo en simultáneo.

**Dependencies:** Tasks 4, 6

**Files likely touched:**
- `src/middlewares/with-auth.tsx`
- `src/pages/404.tsx`
- `src/components/pages/login/LoginForm.tsx`

**Estimated scope:** Medium: 3-5 files (terminó tocando 11 por las razones de arriba)

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

## Task 10: `AppShell` + `Topbar` ✅

**Description:** Construir el armazón de las pantallas autenticadas: `AppShell` (envuelve topbar + sidebar + contenido) y `Topbar` (logo, `ThemeToggle`, dropdown con Perfil / Cambiar contraseña / Cerrar sesión), igualando el mockup.

**Acceptance criteria:**
- [x] "Cambiar contraseña" en el dropdown dispara el mismo flujo/modal de confirmación que "Resetear contraseña" del admin, aplicado a la propia cuenta
- [x] "Cerrar sesión" limpia la sesión y redirige a `/login`
- [x] El nombre y rol mostrados en el topbar vienen de `useSession`, no hardcodeados

**Verification:**
- [x] Tests pass: `npm run test -- Topbar` (6/6; suite completa 100/100)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — `/` con cookie de sesión válida responde 200 y muestra "MyOwnSpace" y el nombre real del usuario en el topbar. Comparación pixel-a-pixel contra el mockup pendiente para el QA visual de la Tarea 22 (sin herramienta de navegador en este entorno)

**Cambios acordados con el usuario antes de escribirse** (compartí el código completo, él aplicó 5 de los 7 archivos directamente, yo completé `auth.api.ts` — le faltaba `logout()` — y `pages/index.tsx` — todavía no envolvía el placeholder en `AppShell`):
- `src/services/auth/auth.api.ts` (modificado) — se agregó `logout()`
- `src/services/users/users.api.ts` (nuevo) — solo `resetPassword()` por ahora; `list/create/update/toggleStatus` llegan en la Fase 3
- `src/services/api-services.ts` (modificado) — registra `users`
- `src/components/common/ResetPasswordConfirmModal.tsx` (nuevo) — compartido entre autoservicio (esta tarea) y admin-sobre-otros (Tarea 20)
- `src/components/layout/Topbar.tsx` (nuevo)
- `src/components/layout/AppShell.tsx` (nuevo) — recibe `sidebar` como prop (no importa `Sidebar` directamente), así queda como layout puro sin lógica de rol
- `src/pages/index.tsx` (modificado) — envuelto en `AppShell` con un placeholder de texto donde va el sidebar, solo para verlo en el navegador ya; el contenido real del dashboard sigue siendo la Tarea 13

**Decisión de diseño:** el modal de "Cambiar contraseña" en modo autoservicio no muestra el correo explícito (dice "tu dirección registrada") porque `useSession()` no expone `correo` — agregarlo hubiera implicado tocar el contrato `Session` y ~6 archivos de test por un beneficio cosmético menor. En el modo admin-sobre-otro (Tarea 20) sí se muestra el correo real, porque ahí se tiene el `User` completo.

---

## Task 11: `Sidebar` por rol ✅

**Description:** Construir `Sidebar`, cuyo contenido depende del rol de la sesión: Empleado ve "Crear solicitud" + "Cerrar sesión"; Administrador ve navegación "Solicitudes" / "Usuarios" + "Cerrar sesión".

**Acceptance criteria:**
- [x] El contenido del sidebar cambia correctamente según `Session.rol`
- [x] El ítem activo (según la ruta actual) se resalta visualmente, igual que en el mockup

**Verification:**
- [x] Tests pass: `npm run test -- Sidebar` (6/6; suite completa 106/106)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — `/` con cookie de Empleado muestra "Crear solicitud"; con cookie de Administrador muestra "Solicitudes"/"Usuarios"

**Compartí el código antes de escribirlo; el usuario aplicó ambos archivos directamente** (`Sidebar.tsx` y el `index.tsx` actualizado), coincidiendo exactamente con lo acordado. Yo agregué los tests.

**Decisiones de diseño:**
- `onCreateRequest?: () => void` — prop opcional para que el botón "Crear solicitud" quede listo visualmente sin adelantar el modal de la Tarea 14.
- Los links "Solicitudes"/"Usuarios" apuntan a `/admin/requests` y `/admin/users`, que todavía no existen (Tareas 15/17) — clickearlos hoy cae en el 404, comportamiento esperado.
- "Cerrar sesión" queda tanto en el Sidebar como en el dropdown del Topbar (redundante a propósito, así lo pedía el criterio de aceptación original y así estaba en el mockup).

**Bug propio detectado y corregido en el camino:** el helper de test `renderSidebar` infería el tipo de `rol` como el literal `'Empleado'` (por el primer objeto de sesión usado), lo cual hacía que TypeScript rechazara pasarle una sesión de Administrador — `npm run test` no lo detectó (los tests igual pasaban en runtime), pero `npm run typecheck` sí. Se corrigió tipando explícitamente el parámetro como `Session | null`.

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/layout/Sidebar.tsx`

**Estimated scope:** Small: 1-2 files

---

## Task 12: `useSession` ✅

**Description:** Hook que expone el usuario/rol actual a partir de la sesión resuelta server-side por `with-auth.tsx`, para que `Topbar`/`Sidebar`/páginas lo consuman sin prop-drilling manual.

**Acceptance criteria:**
- [x] `useSession()` devuelve `Session | null` (`{ userId, nombre, rol, estado }` o `null` si no hay sesión)
- [x] No hace ninguna llamada de red propia — solo lee lo que `getServerSideProps` ya resolvió

**Verification:**
- [x] Tests pass: `npm run test -- useSession` (2/2; suite completa 86/86)
- [x] Build succeeds: `npm run typecheck`, `npm run build`
- [x] Manual check: N/A (sin UI todavía que lo consuma — llega con la Tarea 10)

**Se hizo en orden distinto al listado del plan, a propósito** (ver discusión en el chat): esta tarea se ejecutó **antes** que la 10 y la 11, porque ambas necesitan saber quién está logueado. Se resolvió con una decisión de arquitectura que no estaba en el spec original: **`with-auth.tsx` ahora inyecta automáticamente `session` en el `props` de cualquier página que envuelve** (función `withSessionProp`), en vez de que cada página tenga que acordarse de devolverla a mano. `_app.tsx` toma `pageProps.session` y lo expone vía `SessionContext`; `useSession()` lo lee.

**Archivos, todos co-diseñados y aprobados por el usuario antes de escribirse** (pidió ver el código primero):
- `src/hooks/useSession.ts` (nuevo) — el usuario lo aplicó directamente
- `src/pages/_app.tsx` (modificado) — el usuario lo aplicó directamente
- `src/middlewares/with-auth.tsx` (modificado, `withSessionProp`) — aplicado acá, con tests nuevos

**Dependencies:** Tasks 3, 9

**Files likely touched:**
- `src/hooks/useSession.ts`

**Estimated scope:** Small: 1-2 files (terminó tocando 3, por la decisión de inyección automática)

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

## Task 13: Dashboard Empleado — tabla de solicitudes ✅

**Description:** Reescribir `pages/index.tsx` para mostrar `RequestsTable` con las solicitudes del usuario logueado (filtradas por `employeeId` en el servicio), igualando el mockup: columnas Tipo/Fecha/Motivo/Estado con badges de color por estado.

**Acceptance criteria:**
- [x] La tabla solo muestra solicitudes del `userId` de la sesión actual
- [x] Cada estado (`Pendiente`/`Aprobada`/`Denegada`) tiene el color de badge correspondiente al mockup
- [x] Estado vacío (sin solicitudes) muestra un mensaje, no una tabla en blanco

**Verification:**
- [x] Tests pass: `npm run test -- RequestsTable` (4/4 tabla + 3/3 hook; suite completa 120/120)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — Empleado en `/` → 200 con "Mis solicitudes" y el estado de carga inicial (los datos se resuelven client-side después de la hidratación, `curl` no puede verlos poblados — cubierto por los tests del hook); Administrador en `/` → **404**, primera vez que la restricción por rol de la Tarea 9 protege una ruta real

**Decisiones de estructura (compartidas y aprobadas antes de escribir):**
- `requests.api.ts` se construyó completo (5 funciones) de una sola vez, ya que el mock las tenía todas listas desde la Tarea 4 — evita ir agregando función por función en las Tareas 14-16.
- `StatusBadge` como componente compartido en `components/common/` — lo va a reusar también la tabla del Administrador (Tarea 15).
- Carga de datos separada de la tabla: `useEmployeeRequests` (hook) vs `RequestsTable` (presentacional) — así la Tarea 14 solo necesita llamar `reload()` sin tocar la tabla.
- Se agregó `{ roles: ['Empleado'] }` a `withAuth` en `index.tsx` (no estaba en la lista original), para que un Administrador que navegue a `/` a mano reciba 404 en vez del dashboard equivocado.

**Dependencies:** Tasks 4, 11, 12

**Files likely touched:**
- `src/pages/index.tsx`
- `src/components/pages/employee/RequestsTable.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Medium: 3-5 files (terminó tocando 6 por `StatusBadge` y `useEmployeeRequests`)

---

## Task 14: Modal "Crear solicitud" ✅

**Description:** Construir `CreateRequestModal` con los campos Tipo (los 4 valores exactos), Fecha desde/hasta, Motivo, validados con zod, llamando a `requests.api.create()`. Al confirmar, la tabla del dashboard se actualiza con la nueva solicitud en estado `Pendiente`.

**Acceptance criteria:**
- [x] Los 4 tipos de solicitud disponibles son exactamente: Emergencia, Enfermedad, Permiso personal, Otro
- [x] Fecha "hasta" no puede ser anterior a "desde" (validación de formulario)
- [x] Tras crear, la nueva solicitud aparece en la tabla sin recargar la página (`onCreated={reload}` en `index.tsx`)

**Verification:**
- [x] Tests pass: `npm run test -- CreateRequestModal` (6/6 modal + 3/3 select; suite completa 129/129)
- [x] Build succeeds: `npm run build`
- [x] Manual check: crear una solicitud requiere clicks/formulario reales (abrir desde el Sidebar, tipear, enviar) — no verificable por `curl`; cubierto a fondo por los tests de `CreateRequestModal` con interacciones reales de DOM (incluye probar los 4 tipos, la validación de fechas, y que la nueva solicitud realmente queda en el mock en estado Pendiente)

**Decisiones de estructura (compartidas y aprobadas antes de escribir):**
- `Select` nuevo en `components/common/form/` (mismo patrón visual que `TextInput`) — la Tarea 18 lo va a reusar para el campo "Rol".
- El hook `useCreateRequestForm` no tiene test propio — sigue el mismo patrón que `useLoginForm`/`useForgotPasswordForm`/`useSetPasswordForm`: se prueba a través del componente (`react-hook-form` necesita inputs reales del DOM para el modelo no controlado).
- `index.tsx` conecta `onCreateRequest` del `Sidebar` (dejado listo en la Tarea 11) para abrir el modal, y pasa `reload` de `useEmployeeRequests` (Tarea 13) como `onCreated`.

**Nota de test:** Carlos Rivas (`u4`, usado en los tests) ya tiene una solicitud pre-cargada en los fixtures del mock (`r6`) — las aserciones comparan contra la cantidad inicial en vez de un número fijo, para no acoplarse a los datos de ejemplo.

**Dependencies:** Task 13

**Files likely touched:**
- `src/components/pages/employee/CreateRequestModal.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Medium: 3-5 files (terminó tocando 4, sin contar `index.tsx` ya modificado en la Tarea 13)

---

## Task 15: Dashboard Admin — Solicitudes pendientes ✅

**Description:** Construir `pages/admin/requests.tsx` con `RequestsTable` (variante admin: columna Empleado + acciones), mostrando por defecto las solicitudes en estado `Pendiente` de todo el equipo.

**Acceptance criteria:**
- [x] Por defecto se listan solo las solicitudes `Pendiente`
- [x] Los tabs "Aprobadas/Denegadas/Todas" se renderizan visualmente pero no filtran todavía (documentado como fuera de alcance funcional en `SPEC.md`)

**Verification:**
- [x] Tests pass: `npm run test -- admin/RequestsTable` (5/5 tabla + 3/3 hook; suite completa 143/143)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — Empleado en `/admin/requests` → **404** (primera vez que la restricción por rol protege una segunda ruta real); Administrador → 200 con "Solicitudes del equipo" y "Pendientes"

**Decisión de estructura no prevista originalmente:** la columna "Empleado" necesita el nombre real, no solo el `employeeId` que trae `LeaveRequest`. Esto adelantó `users.api.ts` → `list()` (estaba planeada para la Tarea 17) — wrapper trivial, el mock ya la tenía lista desde la Tarea 4. De paso extraje `getInitials` (antes función local de `Topbar.tsx`) a `src/helpers/get-initials.ts`, compartido entre el Topbar y esta tabla.

**Dependencies:** Tasks 4, 11, 12

**Files likely touched:**
- `src/pages/admin/requests.tsx`
- `src/components/pages/admin/RequestsTable.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Medium: 3-5 files (terminó tocando 7 por `users.api.ts`, `get-initials.ts` y `useAdminRequests.ts`)

---

## Task 16: Acciones Aprobar/Denegar ✅

**Description:** Conectar los botones "Aprobar"/"Denegar" de cada fila a `requests.api.approve()` / `requests.api.deny()`. Al confirmar, la fila desaparece de la vista de Pendientes (o cambia de estado) sin recargar la página.

**Acceptance criteria:**
- [x] "Aprobar" cambia el estado a `Aprobada` y registra `reviewedBy`/`reviewedAt`
- [x] "Denegar" cambia el estado a `Denegada` con el mismo registro
- [x] La fila se retira de la lista de Pendientes tras la acción (filtrado local en `useAdminRequests`, sin recargar)

**Verification:**
- [x] Tests pass: `npm run test -- admin/RequestsTable` (incluido en la Tarea 15; suite completa 143/143)
- [x] Build succeeds: `npm run build`
- [x] Manual check: cubierto por los tests del hook (`approve`/`deny` verificados contra el mock real: sacan la fila de la lista y dejan `estado`/`reviewedBy` correctos) — la interacción de clicks reales queda en los tests de `RequestsTable`, no verificable por `curl`

**Nota:** se implementó junto con la Tarea 15 (mismo hook, mismo archivo) ya que "conectar los botones" no tiene sentido como paso separado de construir la tabla que los contiene.

**Dependencies:** Task 15

**Files likely touched:**
- `src/components/pages/admin/RequestsTable.tsx`
- `src/services/requests/requests.api.ts`

**Estimated scope:** Small: 1-2 files

---

## Task 17: Dashboard Admin — Usuarios (tabla + contadores) ✅

**Description:** Construir `pages/admin/users.tsx` con las 3 tarjetas de conteo (Total/Activos/Pendientes, calculadas del dato real, no hardcodeadas) y `UsersTable` con avatar/nombre/correo, rol, estado y acciones condicionales según estado.

**Acceptance criteria:**
- [x] Los contadores se recalculan a partir de la lista de usuarios del mock
- [x] "Editar" y "Resetear contraseña" solo visibles si `estado === 'Activo'`
- [x] "Desactivar" visible si `Activo`; "Activar" visible si `Desactivado`
- [x] El usuario logueado se identifica con la etiqueta "TÚ" en su propia fila

**Verification:**
- [x] Tests pass: `npm run test -- UsersTable` (8/8 tabla + 1/1 hook + 3/3 badge; suite completa 165/165)
- [x] Build succeeds: `npm run build`
- [x] Manual check: servidor real — Empleado en `/admin/users` → 404; Administrador → 200. Contadores y etiqueta "TÚ" requieren hidratación del cliente (no verificables por `curl`) — cubiertos por los tests del hook y de la tabla

**Nota:** "Editar" (icono) siempre visible independientemente del estado — la acción en sí (abrir el formulario de edición) se conecta en la Tarea 19; acá solo se construyó el ícono y el callback opcional `onEdit`.

**Dependencies:** Tasks 4, 11, 12

**Files likely touched:**
- `src/pages/admin/users.tsx`
- `src/components/pages/admin/UsersTable.tsx`
- `src/services/users/users.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 18: Modal "Crear usuario" ✅

**Description:** Construir `CreateUserModal` (Nombre, Correo, Rol) validado con zod, llamando a `users.api.create()`. El nuevo usuario queda en estado `Pendiente`.

**Acceptance criteria:**
- [x] Rol solo permite `Empleado` o `Administrador` (no SuperAdmin)
- [x] Tras crear, el usuario aparece en la tabla con estado `Pendiente` (`onCreated={reload}` en `admin/users.tsx`)
- [x] Correo duplicado (ya existente en el mock) muestra error de validación — en el campo Correo, vía `setError` de react-hook-form

**Verification:**
- [x] Tests pass: `npm run test -- CreateUserModal` (6/6; suite completa 165/165)
- [x] Build succeeds: `npm run build`
- [x] Manual check: requiere clicks/formulario reales — no verificable por `curl`; cubierto a fondo por los tests (crea contra el mock real y confirma que el nuevo usuario queda Pendiente)

**Cambio no previsto en el archivo original, necesario para que el criterio de correo duplicado fuera real:** `mockUsersAdapter.create()` (Tarea 4) no rechazaba correos repetidos — se le agregó esa validación (comparación case-insensitive), igual que `login` ya rechaza credenciales inválidas. Se agregaron 2 tests nuevos en `mock-adapter.test.ts` para cubrirlo.

**Dependencies:** Task 17

**Files likely touched:**
- `src/components/pages/admin/CreateUserModal.tsx`
- `src/services/users/users.api.ts`

**Estimated scope:** Medium: 3-5 files

---

## Task 19: Editar usuario ✅

**Description:** Conectar la acción "Editar" a un formulario (modal o inline, a definir en implementación) que permite modificar nombre, correo y rol de un usuario existente, llamando a `users.api.update()`.

**Acceptance criteria:**
- [x] Los cambios se reflejan en la tabla sin recargar la página (`onUpdated={reload}` en `admin/users.tsx`)
- [x] Rol sigue restringido a `Empleado` | `Administrador`

**Verification:**
- [x] Tests pass: `npm run test -- EditUserModal` (5/5; suite completa 174/174)
- [x] Build succeeds: `npm run build`
- [x] Manual check: requiere clicks/formulario reales — no verificable por `curl`; `/admin/users` sin sesión redirige 307 a `/login` como se espera; el flujo de edición en sí queda cubierto a fondo por los tests contra el mock real (precarga, validación, correo duplicado, guardado)

**Decisión de implementación:** `EditUserModal` no usa un prop `isOpen` interno (a diferencia de `CreateUserModal`); el padre lo monta condicionalmente (`{editingUser && <EditUserModal key={editingUser.id} .../>}`). Es necesario porque `react-hook-form` fija los `defaultValues` en el primer render: si el componente quedara siempre montado, al editar un segundo usuario el formulario seguiría mostrando los datos del primero. `key={editingUser.id}` fuerza un remount limpio por usuario.

**Cambio no previsto, necesario para que el criterio de correo duplicado fuera real:** `mockUsersAdapter.update()` (Tarea 4) no rechazaba correos ya usados por otro usuario — se le agregó esa validación (case-insensitive, excluyendo al propio usuario editado), mismo patrón que el gap resuelto en la Tarea 18 para `create()`.

**Nota de implementación:** el usuario aplicó los archivos base (`users.api.ts`, `mock-adapter.ts`, `useEditUserForm.ts`, `EditUserModal.tsx`) directamente en su IDE a partir del código compartido en el chat; yo agregué el test (`EditUserModal.test.tsx`) y el wiring en `admin/users.tsx`, y verifiqué el conjunto completo.

**Dependencies:** Task 17

**Files touched:**
- `src/services/mocks/mock-adapter.ts`
- `src/services/users/users.api.ts`
- `src/components/pages/admin/useEditUserForm.ts` (nuevo)
- `src/components/pages/admin/EditUserModal.tsx` (nuevo)
- `src/components/pages/admin/EditUserModal.test.tsx` (nuevo)
- `src/pages/admin/users.tsx`

**Estimated scope:** Small: 1-2 files (real: 6 files, por el gap de duplicados y el wiring)

---

## Task 20: Resetear contraseña + Activar/Desactivar ✅

**Description:** Construir `ResetPasswordConfirmModal` (Sí/No), reutilizado tanto para resetear la propia contraseña del admin logueado como la de cualquier otro usuario. Conectar "Activar"/"Desactivar" a `users.api.toggleStatus()`.

**Acceptance criteria:**
- [x] El popup funciona igual sobre la propia fila del admin logueado (con etiqueta "TÚ") y sobre cualquier otro usuario, incluyendo otros administradores — `ResetPasswordConfirmModal` (Tarea 10) ya soportaba `userEmail`/`isSelf`, se reutilizó tal cual sin tocarla, pasando ahora datos de un tercero en vez de `isSelf`
- [x] Confirmar reseteo deja al usuario en estado `Pendiente` — cubierto por `mockUsersAdapter.resetPassword()` (Tarea 4)
- [x] Desactivar/Activar cambia el estado y las acciones disponibles de esa fila se actualizan de inmediato (`onSuccess={reload}`)

**Verification:**
- [x] Tests pass: `npm run test -- ToggleStatusConfirmModal` (4/4; suite completa 174/174)
- [x] Build succeeds: `npm run build`
- [x] Manual check: `/admin/users` sin sesión redirige 307 a `/login`; el flujo de confirmación en sí (texto según estado, cambio real en el mock, cancelar sin efecto) queda cubierto a fondo por los tests

**Decisión de implementación:** `ResetPasswordConfirmModal` ya existía (Tarea 10) — no se modificó, solo se instanció una segunda vez en `admin/users.tsx` con los datos del usuario objetivo en vez de la sesión propia. Para Activar/Desactivar se construyó `ToggleStatusConfirmModal` como componente nuevo (mismo estilo visual, sin el ícono de llave), ya que no había un modal de confirmación genérico reutilizable para esa acción.

**Dependencies:** Task 17

**Files touched:**
- `src/services/mocks/mock-adapter.ts` (ya traía `toggleStatus()` desde la Tarea 4)
- `src/services/users/users.api.ts`
- `src/components/common/ToggleStatusConfirmModal.tsx` (nuevo)
- `src/components/common/ToggleStatusConfirmModal.test.tsx` (nuevo)
- `src/pages/admin/users.tsx`

**Estimated scope:** Medium: 3-5 files

---

### Checkpoint: Módulos de negocio completos
- [ ] Los 3 flujos de punta a punta funcionan contra mocks: empleado crea solicitud → admin la aprueba/deniega; admin crea usuario → usuario queda Pendiente → define contraseña → pasa a Activo
- [ ] Revisión visual contra el mockup publicado (luz y oscuro)
- [ ] Revisar con el usuario antes de continuar

---

## Fase 4 — Limpieza

## Task 21: Eliminar scaffolding sin uso ✅

**Description:** Quitar `pages/api/hello.ts` y cualquier otro archivo de plantilla sin uso real (revisar `TextInput.tsx` si terminó sin consumidores, `.gitkeep` ya reemplazados por archivos reales). Pase final de `lint` + `typecheck` sobre todo el proyecto.

**Acceptance criteria:**
- [x] `npm run lint` y `npm run typecheck` sin errores ni warnings nuevos
- [x] No quedan archivos de ejemplo de `create-next-app` sin uso

**Verification:**
- [x] Tests pass: `npm run test` (174/174)
- [x] Build succeeds: `npm run build` (confirma que `/api/hello` ya no aparece en las rutas generadas)
- [x] Manual check: `git status` limpio — solo los 2 cambios esperados (`README.md` modificado, `src/pages/api/hello.ts` eliminado)

**Hallazgos:**
- `src/pages/api/hello.ts`: endpoint de ejemplo de `create-next-app`, sin consumidores (confirmado por grep) — eliminado, junto con el directorio `src/pages/api/` ahora vacío.
- `TextInput.tsx`: revisado, tiene 7 consumidores reales — no se toca.
- `public/favicon.ico` y `public/logo.png`: en uso (logo en `Topbar`) — no son scaffolding.
- `README.md` seguía siendo el boilerplate genérico de `create-next-app` y además referenciaba explícitamente `pages/api/hello.ts` (el archivo eliminado en esta misma tarea), quedando desactualizado — se reemplazó por un README mínimo y real del proyecto (comandos, estructura, puntero a `SPEC.md`/`tasks/`). No estaba listado en el plan original pero cae dentro del alcance de "limpieza de scaffolding".

**Dependencies:** Tasks 6-20 (todas las de negocio)

**Files touched:**
- `src/pages/api/hello.ts` (eliminado)
- `README.md`

**Estimated scope:** Small: 1-2 files

---

## Task 22: QA visual contra el mockup ✅

**Description:** Recorrer las 11 pantallas del mockup publicado (Claude Design) una por una, comparando contra la implementación real en `npm run dev`, en modo claro y oscuro, y corrigiendo discrepancias encontradas.

**Acceptance criteria:**
- [x] Cada pantalla implementada coincide con su artboard correspondiente (colores, espaciados, copy) en ambos temas
- [x] Discrepancias encontradas quedan corregidas o documentadas explícitamente como decisión consciente

**Verification:**
- [x] Tests pass: `npm run test` (174/174)
- [x] Build succeeds: `npm run build`
- [x] Manual check: recorrido pantalla por pantalla (ver método abajo), documentado en la conversación

**Método:** sin herramienta de navegador en este entorno, se extrajeron los 11 artboards fuente (`.dc.html`) del artifact publicado (`MyOwnSpace Dashboard`, `https://claude.ai/artifact/ANaRQhfGj2bJun3aSv3JZS`) parseando el JSON embebido en `<script id="appifact-doc">`, y se compararon línea por línea contra el código real: colores exactos (`tailwind.config.ts` / `globals.css` vs. los hex hardcodeados del mockup — coinciden 1:1 en ambos temas), estructura, y copy textual.

**Discrepancias encontradas y corregidas:**
1. Faltaba el copyright "© DevTech 2026" en el sidebar de las pantallas autenticadas (Main/Admin/AdminUsers) — presente en el mockup debajo de "Cerrar sesión", ausente en `Sidebar.tsx`. Corregido.
2. El texto informativo de `CreateUserModal` ("Crear usuario") estaba incompleto respecto al mockup, que agrega "Pasará a Activo cuando inicie sesión por primera vez." Corregido (con redacción equivalente, no textual).

**Discrepancias menores, documentadas como decisión consciente (no corregidas):**
- `ResetPasswordConfirmModal`: el mockup dice "...con tu nueva contraseña"; la implementación real dice "...con la nueva contraseña" (la copia real evita el posesivo porque el mismo texto se reutiliza tanto para uno mismo como para resetear la contraseña de otro usuario). El mockup además incluye una oración aclaratoria sobre la reutilización del botón entre usuarios, que no se llevó a la implementación real porque el propio modal ya se diferencia dinámicamente vía el título (`¿Restablecer tu propia contraseña?` vs. `¿Restablecer la contraseña de {nombre}?`), haciendo esa aclaración redundante para el usuario final.

**Pantallas revisadas sin discrepancias:** Login, Olvidé mi contraseña, Revisá tu correo, Definí tu nueva contraseña, 404, Dashboard Empleado, Dashboard Admin — Solicitudes, Modal Crear solicitud.

**Dependencies:** Task 21

**Files touched:**
- `src/components/layout/Sidebar.tsx`
- `src/components/pages/admin/CreateUserModal.tsx`

**Estimated scope:** Small: 1-2 files (por corrección puntual)

---

## Post-cierre: Conexión con el backend real (2026-09-17)

No es una tarea del plan original — el plan de 22 tareas ya estaba cerrado. Esto documenta el trabajo hecho una vez que `OwnSpaceAPI` (backend) también quedó completo, para conectar ambos de verdad por primera vez.

**Diseño: coexistencia mock/real por variable de entorno**, no un reemplazo total del mock. Se evaluó reescribir los 17 archivos de test que dependen del adaptador mock (`resetMockState()`/`mockXAdapter`), pero el costo era demasiado alto para el beneficio — se optó por que cada `services/*.api.ts` elija entre el adaptador mock y uno nuevo `*.http-adapter.ts` según `NEXT_PUBLIC_USE_REAL_API` (`.env.local`, gitignorado — nunca se carga en `npm test` por convención de Next.js). Con la variable sin definir, todo sigue exactamente igual que antes — los 174 tests no se tocaron.

**Archivos nuevos:** `src/services/api-client.ts` (instancia de `axios`, `withCredentials: true`), `src/services/auth/auth.http-adapter.ts`, `src/services/users/users.http-adapter.ts`, `src/services/requests/requests.http-adapter.ts`, `.env.example`.

**Archivos modificados:** `src/services/auth/auth.api.ts`, `src/services/auth/refresh-session.ts` (ahora llama a `GET /auth/session` del backend real en vez de decodificar la cookie localmente), `src/services/users/users.api.ts`, `src/services/requests/requests.api.ts`.

**Bugs reales encontrados durante la verificación en vivo (no solo con `curl` — con los dos servidores corriendo y probado en navegador real):**

1. **Logout no esperaba la respuesta del backend.** `logout()` era sincrónico (`fire-and-forget`) porque en modo mock nunca hizo falta esperar nada. Con el backend real, el navegador podía navegar a `/login` antes de que la cookie vieja terminara de borrarse — `/login` la veía "válida" y redirigía a `/`, que da 404 para un Administrador (rol incorrecto). Corregido: `logout()` pasa a ser `async` de verdad y esperar la respuesta real; los dos call sites (`Topbar.tsx`, `Sidebar.tsx`) ahora hacen `await`.

2. **Las 4 páginas públicas (`login`, `forgot-password`, `forgot-password/sent`, `set-password`) redirigían a `/` a cualquiera ya logueado, sin mirar el rol** — un Administrador que visitara cualquiera de esas rutas con sesión activa terminaba en el mismo 404 por rol incorrecto. Bug preexistente (no lo introdujo la conexión con el backend, solo lo hizo visible porque antes nadie probó esta ruta con sesión real). Corregido con un helper compartido `src/helpers/get-home-route.ts` (`Administrador` → `/admin/requests`, `Empleado` → `/`), usado en las 4 páginas y en `useLoginForm.ts` (que ya tenía la lógica correcta, ahora deduplicada).

3. **Certificado de desarrollo HTTPS autofirmado, dos mecanismos de confianza separados:** el navegador lo confía con `dotnet dev-certs https --trust`, pero el proceso de Node.js de Next.js (llamadas server-side en `getServerSideProps`) tiene su propio almacén de confianza TLS y lo rechazaba igual. Resuelto en `next.config.js` (`NODE_TLS_REJECT_UNAUTHORIZED=0`, condicionado a `NODE_ENV === 'development'` — nunca afecta producción ni se empaqueta para el navegador).

**Verificación:** `npm run typecheck`, `npm run lint`, `npm test` (174/174) y `npm run build` limpios después de cada corrección. Flujo real probado de punta a punta con los dos servidores corriendo (backend HTTPS real contra SQL Server, frontend con `NEXT_PUBLIC_USE_REAL_API=true`): login, navegación autenticada, logout, y re-visita a páginas públicas ya logueado — todo verificado con `curl` simulando exactamente la secuencia del navegador antes de confirmarlo en un navegador real.

---

## Post-cierre: Migración Next.js 13 → 16 (2026-09-17)

Rama `chore/nextjs-16-migration`, creada desde `feature/frontend-fases-0-3` (no desde `Develop` — `Develop` todavía no tenía mergeados ni el PR de frontend ni el de backend al momento de esta migración). Motivada por las vulnerabilidades de `npm audit` en Next 13.5.11, pospuestas desde el inicio del proyecto.

**Alcance real vs. temido:** el proyecto usa exclusivamente Pages Router (nada de `app/`), así que casi todos los breaking changes de v14/v15/v16 (Async Request APIs, `cacheComponents`, Partial Prerendering, parallel routes, `revalidateTag`/`updateTag`) no aplicaron — son exclusivos de App Router. Tampoco hay `middleware.ts`, `next/image`, ni `serverRuntimeConfig`/`publicRuntimeConfig`.

**Dependencias actualizadas:** `next` 13.5.11 → 16.3.5, `react`/`react-dom` 18 → 19.3.0, `eslint` 8 → 9.39.5 (no 10.x — sus propios plugins internos, como `eslint-plugin-react`, todavía no soportan ESLint 10), `eslint-config-next` 13.5.4 → 16.3.5, `react-hook-form` 7.47.0 → 7.88.0 y `@hookform/resolvers` 3.3.2 → 5.9.1 (ambos sin soporte formal de React 19 en las versiones viejas), `zod` 3.22.4 → 3.25.76 (solo hasta la última 3.x estable — subir a zod v4 sería una migración aparte, sin relación con Next.js).

**Cambios de configuración:**
- `.eslintrc.json` (legacy) reemplazado por `eslint.config.mjs` (flat config, default en ESLint 10 y recomendado desde v16) — mismo contenido efectivo (`eslint-config-next/core-web-vitals`).
- `package.json`: script `lint` de `next lint` (removido en v16) a `eslint .`.
- `tsconfig.json`: `next build` cambió automáticamente `jsx: "preserve"` → `"react-jsx"` (obligatorio, React 19 usa el runtime automático de JSX) — cambio hecho por la propia herramienta, no manual.
- `next.config.js`: sin cambios — no tenía `webpack` ni `eslint` custom, así que no chocó con el nuevo build-fail-if-webpack-config de Turbopack (default en v16).
- `.gitignore`: se agregó `/AGENTS.md` y `/CLAUDE.md` — Next.js 16 los autogenera en cada `next dev` (instrucciones para agentes de IA apuntando a la doc empaquetada de la versión instalada); se decidió no versionarlos.

**Regla de lint nueva sin fix chico posible — `react-hooks/set-state-in-effect`:** viene con la versión actualizada de `eslint-plugin-react-hooks` en `eslint-config-next@16`. Marca cualquier función llamada desde un `useEffect` que en algún punto de su cuerpo dispare un `setState` — sin distinguir si es antes o después de un `await` (se verificó empíricamente: reestructurar para que el `setState` ocurra después del primer `await` no lo saca del error). La recomendación oficial del equipo de React para este patrón (fetch-en-efecto) es migrar a una librería de data-fetching (TanStack Query) o a Suspense — cambio arquitectónico grande, fuera de alcance para una migración de versión. Hay incluso un issue abierto en `facebook/react` señalando la regla como potencialmente demasiado estricta para este caso. Se optó por suprimirla puntualmente con `eslint-disable-next-line` + comentario explicando el motivo en los 4 sitios afectados: `useAdminRequests.ts`, `useAdminUsers.ts`, `useEmployeeRequests.ts` (fetch inicial) y `useTheme.ts` (lectura de `localStorage`/`matchMedia`, que solo existen en el cliente — ahí el efecto es imprescindible, no hay nada que reestructurar). Queda pendiente como posible refactor futuro si el proyecto adopta una librería de data-fetching.

**Verificación:** `npm run typecheck`, `npm run lint` (0 errores, 1 warning informativo del React Compiler sobre `react-hook-form`), `npm test` (174/174, sin tocar ningún test) y `npm run build` (Turbopack, default en v16) limpios. Verificado con `curl` contra `npm run dev`: rutas protegidas y `/` siguen redirigiendo a `/login` sin sesión (lógica de `with-auth.tsx` intacta), y el CSS de Tailwind se sirve bien bajo Turbopack. QA manual en navegador real con backend real y las cuentas de dev (`julio.perez@devtch.com` / `ana.martinez@devtch.com`, ver sección de contraseñas de dev más abajo): login, logout, redirects por rol y tooltip de Motivo, todo verificado sin problemas.

**Hallazgo durante el QA manual, sin relación con la migración — pendiente aparte:** en `/admin/requests`, los tabs "Aprobadas", "Denegadas" y "Todas" (`src/pages/admin/requests.tsx`) son `<span>` estáticos sin `onClick` ni estado — nunca se cablearon a nada, solo "Pendientes" funciona de verdad (vía `useAdminRequests` → `GET /requests/pending`). El backend tampoco tiene la funcionalidad: `RequestsController` solo expone `GET /requests/mine` y `GET /requests/pending` — no existe ningún endpoint para listar aprobadas, denegadas, ni todas. Es un gap real de feature (frontend y backend), preexistente al build original, no algo que haya introducido la migración a Next 16. Falta decidir cuándo se aborda como tarea nueva.

---

## Post-cierre: Contraseñas de desarrollo para las cuentas sembradas (2026-09-17)

Los usuarios de `SeedData.cs` (backend) nunca tuvieron `PasswordHash` asignado — se sembraron pensados para completarse vía el flujo real de invitación por correo (`/forgot-password` → `PasswordResetToken` → `/set-password`), que a su vez depende de un `IEmailSender` real (pendiente: integración con Resend). Mientras tanto, para poder probar en navegador sin tener que revisar la consola del backend cada vez, se agregó `SeedData.EnsureDevPasswordsAsync` (llamado desde `Program.cs`, solo en `Development`, después de `SeedData.SeedAsync`): fuerza un hash conocido para dos cuentas específicas en cada arranque, usando el mismo `IPasswordHashingService`/`PasswordHasher<User>` que usa el login real.

**Cuentas de dev (se sobreescriben en cada `dotnet run`, no depender de la contraseña que haya quedado de una prueba manual anterior):**
- Admin: `julio.perez@devtch.com` / `Admin123!`
- Empleado: `ana.martinez@devtch.com` / `Empleado123!`

Diseñado para eliminarse sin fricción una vez que el flujo de invitación por correo esté funcionando de verdad (Resend) — es un parche de conveniencia para desarrollo local, no parte del diseño final de altas de usuario.

---

## Post-cierre: El mock ahora replica las reglas de negocio reales del backend (2026-09-21)

Hallazgo de la auditoría de tres agentes (revisión de código): `mock-adapter.ts` simulaba solo el "camino feliz" — varias reglas que el backend real sí aplica no existían del lado mock, así que los 177 tests originales pasaban en verde sin probar nada de esto, y el comportamiento en modo mock podía divergir del real de forma silenciosa.

**Arreglado en `src/services/mocks/mock-adapter.ts`:**
- `login`: ahora es insensible a mayúsculas/minúsculas en el correo (igual que el backend), y rechaza cualquier usuario que no esté `Activo` (antes solo rechazaba `Desactivado` — un usuario `Pendiente` lograba loguear en modo mock, cosa que el backend real siempre rechazó).
- `approve`/`deny` (`setRequestEstado`): rechaza una solicitud que ya no está `Pendiente`, igual que el 409 del backend real. Antes se podía "re-aprobar" una solicitud ya revisada sin error.
- `create` (solicitudes): rechaza un rango de fechas invertido (`fechaFin < fechaInicio`), igual que el backend real.
- `toggleStatus` (usuarios): rechaza a un usuario `Pendiente` (no tiene Activo/Desactivado para alternar todavía), igual que el 409 del backend real.

No se tocó `setPassword` (ya documentado como simplificación intencional — sin backend real no hay token opaco que resolver) ni el bloqueo de asignar rol `SuperAdmin` en `update` — el tipo `UserRole` del frontend ni siquiera incluye `'SuperAdmin'` hoy, así que no es una divergencia real alcanzable vía la API tipada (y tocar el rol de SuperAdmin está fuera de alcance por ahora, ver memoria de sesión).

**Verificación:** `npm run typecheck`, `npm run lint` (0 errores) y `npm test` (182/182 — 177 + 5 nuevos cubriendo cada regla agregada) limpios. Se revisó explícitamente que ningún test existente en el resto del proyecto dependiera del comportamiento viejo (los `approve`/`deny`/`create` usados en otros tests ya apuntaban a fixtures que siguen pasando con las reglas nuevas).

---

## Post-cierre: Reglas de contraseña reconciliadas entre frontend y backend (2026-09-21)

`src/lib/password-rules.ts` (frontend, solo feedback en vivo del formulario) y `OwnSpaceAPI/.../Services/PasswordRules.cs` (backend, la autoridad real) mantienen a mano la misma lista de contraseñas genéricas bloqueadas, y ya habían divergido: el frontend tenía `devtech123!` que el backend no tenía; el backend tenía `contrasena`/`contraseña`/`incorrecta`/`incorrecto` que el frontend no tenía, más una entrada muerta (`12345`, de 5 caracteres — nunca hizo nada, la regla de longitud mínima de 10 ya la rechaza antes).

Se unificaron las dos listas (unión de ambas, sin la entrada muerta), y se dejó un comentario cruzado en los dos archivos apuntando al otro, para que la próxima edición actualice ambos lados. No existe una forma automática de compartir esta lista entre un runtime de TypeScript y uno de C# sin agregar infraestructura nueva (ej. un JSON compartido consumido por los dos) — se consideró desproporcionado para una lista de ~11 strings en una app interna, así que se optó por la reconciliación manual + el comentario, no por una solución de una sola fuente de verdad.

**Verificación:** `npm test` (183/183) y `dotnet test` (68/68) limpios, con un test nuevo en cada lado probando que las entradas agregadas para igualar al otro lado efectivamente rechazan.
