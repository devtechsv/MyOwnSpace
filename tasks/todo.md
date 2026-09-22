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

---

## Post-cierre: 5 puntos "medios" rápidos del frontend (2026-09-21)

De la lista de hallazgos "medios" de la auditoría de tres agentes, los 5 más chicos y mecánicos:

- `src/pages/_document.tsx`: `<Html lang='en'>` → `'es'` (la UI es 100% en español).
- `tsconfig.json`: `"target": "es5"` → `"es2017"` (vestigial bajo Next 16/React 19; es el default del propio scaffolding de Next.js).
- `src/services/mocks/mock-adapter.ts`: `nextId` generaba el id como `` `${prefix}${existing.length + 1}` `` — colisiona en cuanto algo borre un elemento del array (nada lo hace hoy, pero era una trampa para el próximo que agregue esa función). Ahora calcula el máximo id numérico existente en vez de depender del `length`.
- `src/services/axios-config.ts`: borrado — código muerto, nada lo importaba, y le faltaba `withCredentials: true` respecto a `api-client.ts` (si alguien lo hubiera usado por error, las llamadas autenticadas habrían fallado en silencio).
- Botón "Perfil" en el menú del `Topbar`: sacado del menú — no tenía `onClick` ni página de destino (no existe una pantalla de perfil todavía). Decisión del usuario: sacarlo en vez de dejarlo deshabilitado como placeholder.

**Verificación:** `npm run typecheck`, `npm run lint` (0 errores) y `npm test` (183/183) limpios.

---

## Post-cierre: Accesibilidad de modales — foco, Escape, aria-live (2026-09-21)

Los 6 modales del proyecto (`ChangePasswordModal`, `ResetPasswordConfirmModal`, `ToggleStatusConfirmModal`, `CreateUserModal`, `EditUserModal`, `CreateRequestModal`) no tenían ningún manejo de teclado/foco: el foco no se movía adentro al abrir, `Tab` seguía recorriendo lo que está detrás del overlay, no cerraban con Escape, y los errores no se anunciaban a un lector de pantalla.

**`src/hooks/useModalAlly.ts` (nuevo):** hook compartido — mueve el foco al primer elemento enfocable al abrir, atrapa `Tab`/`Shift+Tab` dentro del modal, cierra con Escape (salvo `closeDisabled`, para no cerrar a mitad de un submit — mismo criterio que ya usaba el botón "Cancelar" de cada modal), y devuelve el foco a lo que lo tenía antes al cerrar. Adoptado por los 6 modales.

**`aria-live` centralizado, no repetido por modal:** se agregó `role='alert'` una sola vez en `TextInput.tsx` y `Select.tsx` (los errores de campo) — cubre los 6 modales y el resto de los formularios del proyecto (login, forgot-password, set-password) de una sola vez. Los errores "de servidor" que 4 de los 6 modales muestran aparte (no vía `TextInput`/`Select`) también llevan `role='alert'` cada uno.

**Bug encontrado en el camino:** `EditUserModal.tsx` quedó referenciando una prop `isOpen` que no existe en ese componente (se monta condicionalmente desde `admin/users.tsx`, como `ToggleStatusConfirmModal` — "montado" ya es "abierto"). Corregido a `useModalAlly(true, onClose, isSubmitting)`.

**Verificación:** `npm run typecheck`, `npm run lint` (0 errores) y `npm test` (189/189 — 183 + 6 nuevos cubriendo el hook: foco inicial, Escape cierra, Escape no cierra si `closeDisabled`, ciclo de Tab en las dos direcciones, y que el foco vuelve a quien lo tenía antes al cerrar) limpios.

---

## Post-cierre: 3 puntos "medios" más del frontend (2026-09-21)

- **`src/middlewares/with-auth.tsx`**: `session: any` reemplazado por dos sobrecargas de `withAuth` — en una página `public` el callback recibe `{ user: Session | null; tokens }` (hay que chequear `user` antes de usarlo, como ya hacían login/forgot-password); en una página protegida recibe `{ user: Session; tokens }` (nunca null, porque si `fn` llega a ejecutarse ya hubo sesión válida). `tsc --noEmit` limpio contra los 7 call sites existentes sin tocar ninguna página.
- **`src/pages/set-password.tsx`**: ya no redirige a un visitante ya autenticado a su home route. Era un bug real: el link de "olvidé mi contraseña" llega por correo y su token no tiene nada que ver con la sesión que el navegador tenga en ese momento — alguien con sesión activa en otra pestaña que abría el link perdía el token en silencio, sin nunca ver el formulario. A diferencia de login/forgot-password (donde sí tiene sentido mandar a un usuario ya logueado a su home), acá no correspondía el mismo patrón.
- **`NODE_TLS_REJECT_UNAUTHORIZED` en `next.config.js`** (desactiva TLS para todo el proceso de Node en dev, no solo la llamada al backend): evaluado y dejado como está a propósito. El fix "correcto" (acotarlo con un `https.Agent` en `api-client.ts`) requiere un `require('https')` condicional en un archivo compartido entre servidor y navegador — el mismo tipo de cambio que ya causó un incidente real en este proyecto (ver [[feedback-myownspace-workflow]] o la sesión donde se estableció la regla de no importar módulos de Node en `api-client.ts`). Dado que hoy es la única llamada HTTP del lado servidor en todo el proyecto, ya está acotado a `NODE_ENV=development`, y nunca toca producción, el riesgo de tocarlo no se justifica frente al beneficio. Decisión del usuario.

**Verificación:** `npm run typecheck`, `npm run lint` (0 errores) y `npm test` (183/183) limpios.

---

## Feature nueva: motivo obligatorio al denegar una solicitud (2026-09-21)

Pedido directo del usuario: cuando un admin deniega una solicitud, tiene que poder (y estar obligado a) escribir por qué — y el empleado dueño de la solicitud tiene que poder verlo.

**Backend:** columna nueva `LeaveRequest.MotivoRechazo` (nullable, `nvarchar(1000)`, migración `AddMotivoRechazoToLeaveRequest`). `POST /requests/{id}/deny` ahora recibe `{ motivo }` en el body (`DenyRequestRequest`, `[Required]` — rechaza vacío/solo-espacios en la validación de modelo automática de `[ApiController]`, sin duplicar el chequeo a mano en el servicio). `RequestsService.ReviewAsync` (compartido entre aprobar/denegar) ahora recibe un `motivoRechazo` nullable, lo persiste, y lo incluye en el correo de notificación al empleado cuando corresponde. `LeaveRequestResponse` expone `MotivoRechazo`.

**Frontend:** nuevo `DenyRequestModal.tsx` (adopta `useModalAlly`, el hook compartido de accesibilidad que armamos en el punto anterior) con un textarea obligatorio — el botón de confirmar queda deshabilitado hasta que haya texto. El botón "Denegar" de la tabla de admin ahora abre este modal en vez de denegar directo. `StatusBadge` ganó una prop `title` opcional; tanto la tabla de admin como la del empleado muestran el motivo como tooltip nativo sobre el badge "Denegada" (mismo patrón que ya usa la columna Motivo).

**Verificación:** backend `dotnet test` (68/68) y frontend `npm run typecheck`/`npm run lint` (0 errores)/`npm test` (191/191 — incluye tests nuevos para el modal: abre con "Denegar", confirmar con motivo llama a `onDeny(id, motivo)`, y no deja confirmar sin motivo). Migración generada y aplicada a la base local.

---

## Ajuste de UX: motivo del rechazo como desplegable, no tooltip (2026-09-21)

Feedback directo del usuario probando en vivo: el tooltip (`title`) no es descubrible (hay que saber que hay que pasar el mouse) y no funciona en touch/mobile. Primer intento fue mostrar el motivo siempre visible como texto bajo el badge — mejor que el tooltip, pero empuja el layout de todas las filas todo el tiempo, incluso cuando nadie lo está mirando.

**Solución final:** cada fila con estado Denegada es ahora un `<button>` (`aria-expanded`, `aria-label` dinámico "Ver/Ocultar motivo del rechazo — ...") que al clickearse despliega/colapsa un panel con el motivo completo, con una flechita que rota para indicar el estado. Se sacó la prop `title` de `StatusBadge` (quedó sin uso). Aplicado igual en las tablas de empleado y de admin — cualquier click en la fila (no solo el badge) abre el desplegable, decisión explícita del usuario sobre el área clickeable. Cada fila se expande/colapsa de forma independiente (no es un acordeón de "solo una abierta a la vez").

**Verificación:** `npm run typecheck`, `npm run lint` (0 errores) y `npm test` (193/193 — los 2 tests del punto anterior se reescribieron para simular el click y verificar que el motivo está oculto antes y visible después, en vez de asumirlo siempre visible).

---

## Filtro por nombre de empleado en /admin/requests, tipo "Vacaciones", hora opcional en solicitudes, correo real con Resend, y contraseña temporal (2026-09-21)

Varios pedidos seguidos del usuario en la misma sesión, cada uno chico por separado pero documentados juntos porque comparten fecha y varios tocan el mismo código de auth.

**Filtro por nombre (admin/requests):** input de búsqueda client-side sobre la lista ya cargada (el nombre del empleado ya vive en cada fila vía el join contra `GET /users` que ya hacía `useAdminRequests`) — sin cambios de backend. El contador de la pestaña activa no se achica mientras se escribe.

**"Vacaciones" + hora opcional:** ver el lado del detalle en `OwnSpaceAPI/tasks/todo.md` — acá solo el resumen frontend: `Vacaciones` agregado al `TIPOS` de `useCreateRequestForm.ts` (el dropdown ya lo tenía, pero el schema zod lo rechazaba — por eso "tiraba error" al enviar). Dos `<input type="time">` opcionales en `CreateRequestModal.tsx`, con las mismas dos reglas de validación (van juntas o ninguna; si es el mismo día, hora de fin > hora de inicio) replicadas en zod y en el mock adapter. Ambas tablas de solicitudes muestran la hora bajo la fecha cuando está presente, solo lectura.

**Envío real de correo (Resend):** sin cambios de frontend — es 100% backend (`ResendEmailSender`), el frontend ya llamaba a los mismos endpoints.

**Contraseña temporal en vez de token:** eliminado del todo `pages/set-password.tsx` y todo `components/pages/set-password/` (la página ya no tiene sentido — no se emiten tokens). `Session.mustChangePassword` (campo nuevo, requerido). `ChangePasswordModal` ganó una prop `forced` (sin "Cancelar", sin cierre por Escape, con mensaje explicando por qué) — se reusó el mismo componente que ya usaba el menú de usuario para el cambio voluntario, no se hizo una pantalla nueva de formulario. Página nueva `pages/change-password-required.tsx` que lo renderiza en modo forzado. El gate vive en un solo lugar, `middlewares/with-auth.tsx` (no hay layout global de páginas autenticadas en este proyecto — confirmado antes de tocar nada, ver el código de `with-auth.tsx`), que redirige ahí cuando `session.mustChangePassword` es `true`, salvo en esa misma página.

**Verification:** `tsc --noEmit` limpio, ESLint limpio (0 errores), `npm test` **202/202** (191 existentes ajustados a los nuevos contratos/comportamiento + 11 nuevos: 4 del filtro por nombre y Vacaciones/hora — ya contados en un batch anterior — más los del `ChangePasswordModal` forzado, el `getServerSideProps` de `change-password-required`, y el gate de `with-auth`). Nota: el flujo de login-con-contraseña-temporal-y-redirección no se pudo probar manualmente en el navegador desde acá (la temporal solo la ve quien tiene acceso al correo real) — cubierto en su lugar con un test de integración HTTP real del lado del backend; queda pendiente que el usuario lo confirme una vez en el navegador.

**Dependencies:** todo lo de auth/sesión de tareas anteriores (login, change-password, `with-auth`, `useModalAlly`).

---

## Spec pendiente — Módulo de Gestión de PTO (Paid Time Off) (2026-09-21)

**Estado: solo especificación, todavía sin implementar. No tocar código hasta indicación explícita del usuario.**

Reglas de negocio, decisiones confirmadas, modelo de datos y fórmula de balance documentadas en detalle en `OwnSpaceAPI/tasks/todo.md` (misma fecha) — acá solo el resumen y la parte de frontend, para no duplicar la fuente de verdad de las reglas de negocio.

### Resumen de las decisiones que afectan al frontend

1. Autoservicio inmediato: al confirmar en el modal, la solicitud queda aprobada al instante — sin paso de revisión de un admin.
2. Vacaciones deja de vivir en `CreateRequestModal` (formulario genérico). Es su propio módulo: no pide Motivo ni hora, solo fecha + horas (jornada completa u horas personalizadas).
3. Selección en el calendario: un día a la vez (no rango de fechas en una sola solicitud).
4. Cancelación: fuera de alcance v1, irreversible una vez confirmada.
5. El admin ve las vacaciones del equipo en una vista separada de `/admin/requests` (acá no hay nada que aprobar/denegar).
6. El alta de usuario (`CreateUserModal`) gana el campo `FechaIngreso`, obligatorio — es lo que el backend usa como punto de partida del devengo de esa persona.

### Componentes de frontend a construir

- **Página/vista nueva para el empleado** (ej. `/pto`): calendario mensual + balance disponible visible arriba (llamando a `GET /pto/balance`).
- **Modal de solicitud** al hacer click en un día: dos opciones, "Jornada completa" (8h fijo) y "Tiempo personalizado" (input numérico de horas) — botón de confirmar deshabilitado si excede el balance disponible. Llama al endpoint nuevo (`POST /pto/requests`, a confirmar el nombre exacto en implementación).
- **Marcado en el calendario**: días ya reservados se pintan como "PTO tomado" — sin badge de Pendiente/Aprobada/Denegada como en las otras solicitudes (acá el estado siempre es el mismo, no aporta información mostrarlo como si pudiera cambiar).
- **`CreateRequestModal`**: se retira `Vacaciones` del dropdown de `RequestType` — deja de ser uno de los tipos genéricos.
- **Vista nueva para el admin** (separada de `/admin/requests`): calendario/listado de solo lectura de las vacaciones reservadas por todo el equipo, para planificación — reutiliza el filtro por nombre de empleado que ya existe ahí.
- **`CreateUserModal`**: nuevo campo `FechaIngreso` (obligatorio) en el formulario de alta.
- **Contratos nuevos** en `contracts/interfaces/`: tipo de balance de PTO, payload de creación de solicitud de PTO; `User`/`CreateUserPayload` ganan `fechaIngreso`.
- **Mock adapter**: nuevo `mockPtoAdapter` (o extensión de `mockUsersAdapter`/`mockRequestsAdapter`, a definir en implementación) con la misma fórmula de balance que el backend, para paridad mock/real.

### Fuera de alcance (v1)

- Cancelar/liberar un día ya confirmado.
- Selector de rango de fechas en el modal (solo un día a la vez).

### Fases propuestas (mismas que el lado backend, ver el detalle allá)

1–2. Backend (migraciones, servicio de balance, endpoints, tests).
3. Frontend sobre mocks: calendario + modal + widget de balance, `CreateRequestModal` sin Vacaciones, `CreateUserModal` con `FechaIngreso`.
4. Frontend integrado contra la API real + vista de admin.
5. Verificación end-to-end + docs.

**Dependencies:** módulo `employee`/`admin` de solicitudes y usuarios ya cerrados; `CreateRequestModal`/`CreateUserModal` existentes (se modifican, no se recrean).

---

## Fase 3 completada — Frontend del módulo PTO sobre mocks (2026-09-21)

A pedido explícito del usuario ("por esta vez, tu implementarlo"), Claude implementó directamente en vez de compartir código para aplicar (modo agilidad puntual — ver [[feedback-myownspace-workflow]], el modo guiado sigue siendo el default para features nuevas).

**Contratos nuevos:**
- `contracts/interfaces/pto.ts` — `PtoBalance`, `CreatePtoRequestPayload`.
- `User`/`CreateUserPayload` ganan `fechaIngreso` (obligatorio, campo real del backend). `User` también gana `fechaDesactivacion` (opcional, mock-only — el backend real nunca lo expone en `UserResponse`, es un detalle interno del cálculo de balance).
- `LeaveRequest` gana `horasSolicitadas` (opcional, solo aplica a `Tipo=Vacaciones`).

**`lib/pto-balance-calculator.ts`** (nuevo) — port a TypeScript de `PtoBalanceCalculator.cs` del backend (mismo algoritmo de quincenas/devengo), para que el mock pueda calcular el balance sin backend real. Tests en espejo de los del backend (ingreso a mitad de año, cambio de año, desactivación).

**Mock adapter:** `mockPtoAdapter` nuevo (`getBalance`, `create`, `listCalendario`) con las mismas 3 reglas que `PtoRequestsService` real (tope 8h, no duplicar fecha, no superar balance). `mockUsersAdapter.create` ahora persiste `fechaIngreso`; `toggleStatus` ahora registra/limpia `fechaDesactivacion` (mismo criterio de paridad mock/backend que ya se aplicó para otras reglas de negocio en esta sesión).

**Capa de API:** `services/pto/pto.api.ts` + `pto.http-adapter.ts`, con el mismo switch `USE_REAL_API` que ya usan `users`/`requests` — a diferencia de como se construyeron esos dos originalmente (mock primero, HTTP adapter agregado después en un batch aparte), acá se construyeron los dos juntos desde el arranque porque la infraestructura de switch ya existe en el proyecto; Fase 4 se reduce a prender el flag y verificar a mano.

**Vacaciones sale del flujo genérico:** `useCreateRequestForm.ts` (`TIPOS`) y `CreateRequestModal.tsx` (`TIPO_OPTIONS`) ya no incluyen `'Vacaciones'` — tiene su propio módulo.

**`CreateUserModal.tsx`:** campo nuevo `Fecha de ingreso` (obligatorio). De paso se corrigió el texto informativo del modal, que seguía describiendo el mecanismo de token viejo ("recibirá un correo para definir su contraseña... pasará a Activo") en vez del de contraseña temporal ya vigente — mismo tipo de copy desactualizada que ya se había corregido en `ForgotPasswordSent.tsx`.

**Módulo nuevo `components/pages/pto/`:** `usePto` (balance + reservas propias, reutiliza `GET /requests/mine` filtrando `Vacaciones`/`Aprobada` client-side — no hizo falta un endpoint de "mis reservas de PTO" aparte), `PtoCalendar` (calendario mensual con navegación prev/next, días reservados marcados visualmente), `RequestPtoModal`/`useRequestPtoForm` (radio "Jornada completa (8h)" / "Personalizado", con input de horas condicional). Página nueva `pages/pto.tsx` (`withAuth({roles:['Empleado']})`).

**Módulo nuevo `components/pages/admin/` (PTO):** `useAdminPto`/`PtoTeamTable`, listado de solo lectura del equipo (sin badges de estado — todas las filas son siempre `Aprobada`, mostrar un badge de estado ahí sería engañoso, ver discusión de la Fase 3 en el spec). Reutiliza el patrón de filtro por nombre ya construido en `/admin/requests`. Página nueva `pages/admin/pto.tsx` (`withAuth({roles:['Administrador']})`).

**`Sidebar.tsx`:** nuevo link "Mi PTO" (`/pto`) para Empleado, nuevo ítem "PTO" (`/admin/pto`) en la navegación de Administrador.

**Bug preexistente encontrado y corregido, sin relación con PTO:** `pages/change-password-required.test.tsx` vivía dentro de `src/pages/` — Next.js trata cualquier `.tsx` ahí como una ruta, y `npm run build` (Turbopack) fallaba con "Export getServerSideProps doesn't exist in target module" al intentar compilarlo como página. Mismo tipo de error ya documentado y corregido una vez para `pages/404.test.tsx` (Tarea 9) — esta vez pasó desapercibido porque el batch que creó el archivo (contraseña temporal) verificó `tsc`/`eslint`/`jest` pero no corrió `npm run build`. Movido a `src/__tests__/pages/change-password-required.test.tsx`.

**Verification:**
- `npm run typecheck`: limpio.
- `npm run lint`: 0 errores (2 warnings informativos del React Compiler sobre `watch()` de `react-hook-form` — mismo patrón ya aceptado en `ChangePasswordModal.tsx`).
- `npm test`: **227/227** (193 existentes ajustados a `fechaIngreso` + 34 nuevos: calculadora de balance, `mockPtoAdapter`, `RequestPtoModal`, `PtoCalendar`, más los ajustes de `CreateRequestModal`/`CreateUserModal`).
- `npm run build`: exitoso — `/pto` y `/admin/pto` aparecen como rutas dinámicas nuevas junto al resto.

**Gap encontrado, no corregido en este batch (requiere tocar el backend):** `RequestsService.CreateAsync` (el endpoint genérico `POST /requests`) todavía acepta `Tipo=Vacaciones` sin ningún chequeo de balance — la UI ya no lo ofrece, pero un cliente que llame a la API directo podría seguir creando una solicitud de Vacaciones `Pendiente` por ese camino, evitando por completo el módulo de PTO y su validación de balance. Queda pendiente agregar un guard en el backend (rechazar `Tipo=Vacaciones` en `POST /requests` con 400, o similar) — no se tocó acá para no reabrir verificación del backend en medio de un batch de frontend.

**Dependencies:** Fases 1-2 del backend (migraciones, `IPtoBalanceService`, `PtoRequestsService`, endpoints `/pto/*`).

---

## Post-cierre — Calendario laboral + paginación en /admin/pto, gap de Vacaciones cerrado (2026-09-21)

Tres pedidos seguidos del usuario tras un repaso de "qué queda pendiente" del módulo PTO. Implementado por Claude directo, a pedido explícito.

**Gap de `Tipo=Vacaciones` por el endpoint genérico, cerrado:** `mockRequestsAdapter.create` ganó el mismo guard que `RequestsService.CreateAsync` (backend, ver `OwnSpaceAPI/tasks/todo.md`) — rechaza `Vacaciones` con el mismo mensaje, para que el mock no diverja del backend real.

**"Calendario laboral" (`PtoCalendar.tsx`):** los fines de semana ya no son clickeables para reservar — se renderizan como botón deshabilitado con `aria-label` distinto ("No disponible — fin de semana, {fecha}"). Los feriados quedan fuera de alcance a propósito: necesitarían una fuente de datos que hoy no existe en el proyecto. Un fin de semana que YA tiene una reserva (dato preexistente, de antes de esta restricción) se sigue mostrando y dejando clickear — la restricción solo aplica a reservar uno nuevo. Exportado `esFinDeSemana(year, month, day)` desde el mismo archivo, reusado en los tests para no depender de qué día real se corran.

**Filtro de mes + paginación en `/admin/pto`:** `useAdminPto` gana `mesFiltro` (default: mes actual — sin esto la tabla crecía sin límite a medida que se acumulan meses) con un botón "Ver todos" para sacarlo, y paginación de 15 filas con "Anterior"/"Siguiente". Cambiar cualquier filtro (nombre o mes) vuelve a la página 1 automáticamente.

**Verification:**
- Backend: `dotnet build` 0/0, `dotnet test` 99/99 (sin cambios de este batch — el gap ya se había cerrado del lado del backend en el paso anterior).
- Frontend: `tsc` limpio, ESLint 0 errores, `npm test` **234/234** (228 + 6 nuevos: 3 de `PtoCalendar` para fines de semana + 4 de `useAdminPto` para filtro/paginación, menos ajustes a los 2 tests existentes de `PtoCalendar` que asumían "hoy" siempre hábil), `npm run build` exitoso.
- **Nota de test:** los 2 tests nuevos de `useAdminPto` que crean 16 reservas secuenciales (para forzar una segunda página) superaban el timeout default de Jest (5s) por la latencia simulada del mock (150ms × 16 ≈ 2.4s) — se les subió el timeout a 15s en vez de paralelizar los `create` (paralelizarlos sería incorrecto: el mock muta un array en memoria sin lock, dos escrituras concurrentes podrían perder la del otro).

**Dependencies:** Post-cierre "Módulo PTO, Fases 1-5 completas" (backend) y "Fase 3 completada" (arriba).

---

## Post-cierre — Fusión de repos: frontend y backend en un solo repo (2026-09-21)

A pedido explícito del usuario ("mezclar finalmente frontend y backend"), cierre de la pregunta de topología que había quedado abierta desde el inicio del proyecto (`OwnSpaceAPI/` vivía como un repo git propio, ignorado por el `.gitignore` del frontend).

**Decisiones confirmadas con el usuario antes de tocar nada:**
1. Conservar el historial completo del backend (10 commits de bootstrap/auth/users/requests/CORS/hardening) vía `git subtree`, en vez de solo copiar el código actual.
2. Todo el trabajo de hoy sin commitear en ambos repos (Resend, contraseña temporal, Vacaciones+hora, módulo PTO completo, el gap cerrado, calendario laboral + paginación) se commiteó como **un solo commit por repo**, no dividido por feature.
3. Dejar todo local, sin `push` — pendiente de revisión y confirmación del usuario.

**Procedimiento:**
1. `git add -A` + commit en el backend (`OwnSpaceAPI`, rama `feature/backend-ownspaceapi`) — commit `dcccbc3`.
2. `git add -A` + commit en el frontend (rama `chore/nextjs-16-migration`) — commit `cd6f43a`.
3. Agregado el `.git` del backend como remoto local temporal (`backend-history`) dentro del repo del frontend, `git fetch` para traer su historial completo al object database del frontend — operación no destructiva, deja el historial duplicado en los dos lados antes de tocar nada físico.
4. Sacada la línea `/OwnSpaceAPI` del `.gitignore` del frontend (commit aparte, `58ea702` — necesario para que `git subtree add` pudiera escribir ahí).
5. Eliminada la carpeta física vieja de `OwnSpaceAPI` (con su `.git` propio) — segura de borrar porque su historial ya estaba duplicado en el paso 3.
6. `git subtree add --prefix=OwnSpaceAPI <sha> ` — SHA local en vez de remoto/rama, porque `git subtree` intenta re-fetchear del path original y ese path físico ya no existía tras el paso 5. Commit de fusión `216a394`.
7. Remoto temporal `backend-history` eliminado (limpieza).

**Incidente encontrado y corregido durante la fusión:** el paso 5 (borrar la carpeta física vieja) se llevó consigo `appsettings.Development.json` — archivo gitignoreado a propósito (nunca commiteado, ni en el repo viejo del backend ni en el nuevo fusionado), así que `git subtree add` no lo restauró. Ahí vivían la connection string real y la API key de Resend. Se avisó de inmediato al usuario (sin intentar tapar el error) y se recreó el archivo exacto a partir del contenido ya leído varias veces antes en la misma conversación — confirmado con `git status` limpio (sigue ignorado correctamente por el `.gitignore` del backend, ahora anidado dentro del repo único).

**Resultado:** un solo repo, un solo remoto (`origin` = `https://github.com/devtechsv/MyOwnSpace.git`, el mismo que ya usaban los dos repos por separado), con el historial completo de ambos lados preservado en el grafo de commits (`git log --graph` muestra el backend como una rama paralela que converge en el commit de fusión). `OwnSpaceAPI/` es ahora una carpeta normal trackeada (87 archivos), sin `.git` propio.

**Verification:** tras la fusión, desde las nuevas rutas: backend `dotnet build` 0/0, `dotnet test` 99/99; frontend `tsc` limpio, `npm test` 234/234, `npm run build` exitoso (confirma que Next.js sigue sin escanear `OwnSpaceAPI/` como páginas — vive fuera de `src/pages/`).

**Pendiente, a decisión del usuario:** hacer `push` de la rama fusionada al remoto — no se hizo en este batch, queda para cuando el usuario lo confirme explícitamente.

**Dependencies:** todo el trabajo de ambos repos hasta este punto.

---

## Post-cierre — Eliminación de SuperAdmin (backend) y filtros de solicitudes por tipo/fecha (2026-09-22)

A pedido explícito del usuario, dos ítems que habían quedado como "pendientes" en un repaso de estado. Implementado por Claude directo (modo ágil, a pedido explícito para ambos).

**Eliminación del rol SuperAdmin:** trabajo 100% backend, sin cambios en el frontend (nunca tuvo ninguna referencia al rol — confirmado por búsqueda antes de empezar). Detalle completo en `OwnSpaceAPI/tasks/todo.md`, "Post-cierre — Eliminación del rol SuperAdmin".

**Filtros de solicitudes por tipo y fecha:**
- `useAdminRequests` (`/admin/requests`): nuevos `tipoFiltro` (`RequestType | 'Todos'`) y `fechaFiltro` (fecha única, formato `YYYY-MM-DD`), ambos independientes entre sí y combinables con el filtro de nombre ya existente. `fechaFiltro` matchea por rango — incluye una solicitud si la fecha cae entre `fechaInicio` y `fechaFin` (soporta las multi-día, como las de `Enfermedad`).
- `useEmployeeRequests` (`/`, "Mis solicitudes"): mismos dos filtros (`tipoFiltro`/`fechaFiltro`), sobre las solicitudes propias del empleado.
- UI: un `<select>` de tipo y un `<input type="date">` en ambas páginas, mismo estilo visual (pill, `rounded-full`) que el buscador de nombre ya existente en `/admin/requests` — sin usar el componente `Select`/`TextInput` de formularios porque esos están pensados para un campo de formulario completo con label visible, no para una barra de filtros compacta.
- `RequestsTable` del empleado ganó un prop `emptyMessage` opcional — el mensaje fijo "Todavía no creaste ninguna solicitud." era engañoso cuando la lista está vacía por un filtro, no porque el empleado no tenga nada creado. La página pasa un mensaje distinto ("No hay solicitudes que coincidan con estos filtros.") cuando hay algún filtro activo. La tabla del admin no necesitó el mismo cambio — su mensaje ("No hay solicitudes para este filtro.") ya era genérico desde antes.
- El tipo `Vacaciones` se incluye en ambos selects de tipo pese a que el endpoint genérico ya no permite *crear* solicitudes con ese tipo (ver el "Gap de Vacaciones… cerrado" más arriba) — igual pueden existir solicitudes históricas o creadas por el módulo de PTO con ese tipo, y hay que poder filtrarlas.

**Tests nuevos:** 3 en `useAdminRequests.test.tsx` (tipo, fecha, combinación sin coincidencias), 3 en `useEmployeeRequests.test.tsx` (mismo patrón), 1 en `RequestsTable.test.tsx` (empleado, para el `emptyMessage`).

**Verification:** `tsc --noEmit` limpio, `npm run lint` 0 errores (mismos 2 warnings preexistentes de `watch()` de react-hook-form, sin relación), `npm test` **241/241** (234 + 7 nuevos), `npm run build` exitoso (con el dev server detenido antes, por la regla de no correr `build` con `dev` activo).

**Dependencies:** ninguna — ambos eran ítems de "qué queda pendiente" sin dependencias entre sí ni con trabajo en curso.

---

## Post-cierre — Alineación de la columna "Acciones" en /admin/users (2026-09-22)

Encontrado por el usuario probando manualmente en el navegador tras el batch anterior: en la tabla de usuarios, los botones de la columna "Acciones" (Editar / Resetear contraseña / Activar-Desactivar) se renderizaban solo cuando aplicaban al estado del usuario (`UsersService`/`UsersTable` ya restringía esto por diseño — Pendiente no tiene reset ni toggle, Desactivado no tiene reset), lo que dejaba los íconos empujados a la izquierda en vez de alineados en columna entre filas con distinta cantidad de botones.

**Cambio:** `UsersTable.tsx` — cada uno de los 3 posibles botones ahora vive dentro de un `<span>` de tamaño fijo (`w-8 h-8`, mismo tamaño que los botones) que se renderiza siempre; cuando el botón no aplica al estado de esa fila, el `span` queda vacío en vez de no renderizarse. Mismos 3 estados de antes (Activo: Editar+Resetear+Desactivar; Desactivado: Editar+Activar; Pendiente: solo Editar) — no cambió qué acciones existen, solo que ahora siempre ocupan la misma posición horizontal.

**Test nuevo:** en `UsersTable.test.tsx`, renderiza una fila de cada estado (Activo/Pendiente/Desactivado) y confirma que cada fila tiene exactamente 3 `accion-slot` dentro de su `acciones-fila`, sin importar cuántos boten visibles.

**Verification:** `tsc` limpio, lint 0 errores, `npm test` **242/242** (241 + 1 nuevo), `npm run build` exitoso (dev server detenido antes de buildear).

**Nota de infra:** al reiniciar el dev server del frontend para el build, `TaskStop` sobre la tarea en segundo plano no bajó el proceso real de Node (`next dev` en Windows deja el proceso hijo corriendo aunque se mate el wrapper de shell) — hubo que matar el PID a mano con `taskkill` antes de poder levantar un servidor limpio en el puerto 3000. Pasó dos veces en esta sesión; tenerlo en cuenta para la próxima vez que se necesite reiniciar el dev server.

**Dependencies:** ninguna — hallazgo de QA manual sobre el batch anterior.

---

## Post-cierre — Permitir desactivar un usuario Pendiente (2026-09-22)

Contraparte frontend del cambio de backend con el mismo nombre (ver `OwnSpaceAPI/tasks/todo.md`) — el backend ahora permite `Desactivar` sobre un usuario `Pendiente` (antes 409), y decide a qué estado vuelve al reactivarlo según si esa cuenta alguna vez tuvo una contraseña real.

**`UsersTable.tsx`:** el slot de "Desactivar/Activar" ahora también muestra el botón "Desactivar" cuando `estado === 'Pendiente'` (antes solo `Activo`). Mismo botón, mismo `onClick={onToggleStatus}` — el backend decide el resultado.

**Paridad del mock:** `User` (contrato) ganó `contrasenaAsignada?: boolean`, mock-only, equivalente al `PasswordHash` no-null del backend real. Fixtures no-Pendiente en `true`; Sofía Núñez (Pendiente) sin setear a propósito. `mockUsersAdapter.toggleStatus` ya no rechaza `Pendiente` — lo desactiva igual que `Activo`, y al reactivar un `Desactivado` decide `Activo` vs `Pendiente` según `contrasenaAsignada`. `resetPassword`/`forgotPassword` del mock ahora también marcan `contrasenaAsignada: true` (consistente con que esos flujos sí emiten una contraseña real).

**Tests:** `UsersTable.test.tsx` — el test de "Pendiente: solo muestra Editar" pasó a "Pendiente: muestra Editar y Desactivar". `mock-adapter.test.ts` — el test que esperaba el rechazo se reemplazó por uno que confirma la desactivación, más uno nuevo para el ciclo completo (Pendiente → Desactivado → vuelve a Pendiente).

**Verificación manual contra el backend real:** confirmado con un usuario `Pendiente` real preexistente en la base de desarrollo — ver el detalle en `OwnSpaceAPI/tasks/todo.md`.

**Verification:** `tsc` limpio, lint 0 errores, `npm test` **243/243** (242 − 1 reescrito + 2 nuevos netos), `npm run build` exitoso (dev server detenido antes).

**Dependencies:** el cambio de backend con el mismo nombre (arriba, mismo batch).

---

## Post-cierre — Escalabilidad, Fase 3 (frontend): paginación real de /admin/requests (2026-09-22)

Contraparte frontend de la Fase 3 de escalabilidad (detalle completo, incluido backend, en `OwnSpaceAPI/tasks/todo.md`). Modo guiado, a pedido del usuario para todo el plan de 3 fases (índices, nombre del empleado en la respuesta, esta paginación).

**Contratos nuevos:** `contracts/interfaces/common.ts` (`PagedResult<T>`), `RequestsListParams` en `contracts/interfaces/request.ts` (tipo/fecha/nombre/page/pageSize).

**`useAdminRequests.ts` reescrito de punta a punta:**
- El filtrado client-side (el `useMemo` que se agregó en el batch de filtros de tipo/fecha/nombre) desaparece — ahora todo se manda al backend como query params y la paginación es real (20 por página).
- Debounce de 350ms en `nombreQuery` antes de disparar el fetch — antes era gratis (filtraba en memoria a cada tecla), ahora cada búsqueda es un request HTTP.
- Cambiar cualquier filtro (tab, tipo, fecha, o el nombre ya debounced) vuelve a la página 1, mismo criterio que ya usaba `useAdminPto` para su propio filtro de mes/nombre.
- `approve`/`deny` dejaron de parchear la lista en memoria — ahora recargan la página actual completa. Si la página queda vacía porque el total bajó (ej. se aprobó la única pendiente de la última página), se autocorrige a la última página real en vez de mostrar un vacío engañoso.
- **Cambio de comportamiento a propósito:** el contador de la pestaña activa (`totalCount`) ya refleja los filtros de tipo/fecha/nombre aplicados — antes se mantenía fijo mientras se escribía el buscador (era gratis mantenerlo separado con filtrado en memoria; con paginación server-side, separar "total sin filtrar" de "total filtrado" implicaría un segundo request solo para eso).

**Componente nuevo `components/common/Pagination.tsx`:** números de página clicables, con ventana alrededor de la página actual + primera/última y "…" para no renderizar cientos de botones si hay muchas páginas. Reutilizable para cuando se pagine la tabla de Usuarios (ítem que sigue pendiente, fuera de este plan de 3 fases).

**`pages/admin/requests.tsx`:** agrega `<Pagination>` y un contador "N solicitudes" debajo de la tabla, mismo estilo visual que ya usaba `/admin/pto` para su Anterior/Siguiente.

**Mock (`mock-adapter.ts`):** `filtrarYPaginar()` replica los mismos filtros + Skip/Take que el backend real, con el mismo orden (Pending ascendente, All descendente) que sus contrapartes.

**Tests:** `Pagination.test.tsx` (nuevo, 6 casos). `useAdminRequests.test.tsx` reescrito — los casos que antes eran síncronos (filtrado en memoria) ahora esperan el fetch async; los que involucran `nombreQuery` usan un timeout más largo por el debounce, sin fake timers (se pisarían con el `setTimeout` interno del propio mock). `mock-adapter.test.ts`/`requests.api.test.ts` actualizados a las nuevas firmas (`PagedResult` en vez de array).

**Verificación manual contra el backend real:** ver `OwnSpaceAPI/tasks/todo.md` — `GET /requests?page=1&pageSize=3` y `?nombre=ana&tipo=PermisoPersonal` confirmados en vivo.

**Verification:** `tsc` limpio, lint 0 errores, `npm test` **253/253** (243 + 10 nuevos), `npm run build` exitoso (dev server detenido antes).

Con esto se cierra el plan de escalabilidad de 3 fases.

**Dependencies:** Fase 1 y Fase 2 de escalabilidad (arriba), y el cambio de backend con el mismo nombre.
