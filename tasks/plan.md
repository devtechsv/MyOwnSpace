# Implementation Plan: MyOwnSpace — Frontend

## Overview

Construir el frontend de MyOwnSpace (Next.js + TypeScript) según `SPEC.md`, contra una capa de mocks tipada mientras el backend (ASP.NET + SQL Server) no existe. El trabajo se ordena siguiendo el mapa de capacidades ya aprobado: `auth` → `shell` → (`employee-requests`, `admin-requests`, `admin-users` en paralelo) → limpieza final.

## Architecture Decisions

- **Mocks detrás de la misma interfaz de servicio** (`services/*.api.ts`): los componentes nunca importan `mocks/` directamente, para que el día que exista el backend el cambio sea de una sola línea (qué implementación exporta cada `*.api.ts`).
- **Tailwind `darkMode: 'class'` + tokens semánticos**: se agregan colores semánticos (`bg`, `surface`, `border`, `text`, `text-muted`) a `tailwind.config.ts` en vez de repetir `dark:bg-[#...]` sueltos, siguiendo los valores ya validados en el mockup de Claude Design.
- **`with-auth.tsx` se extiende, no se reescribe**: ya resuelve la redirección a `/login` sin token; se le agrega soporte de rol y expiración de 2h sin tocar su forma actual.
- **Test runner nuevo (Jest + RTL vía `next/jest`)**: el proyecto no tenía tests; se elige `next/jest` por ser el soporte oficial de Next.js sin configuración adicional de babel/webpack.
- **SuperAdmin fuera de alcance**: ningún task de este plan crea UI ni lógica para ese rol.

## Task List

Ver detalle completo, criterios de aceptación y verificación de cada tarea en `tasks/todo.md`.

### Fase 0 — Fundaciones
- [x] Tarea 1: Test runner (Jest + RTL) y script `typecheck`
- [x] Tarea 2: Tokens de tema (Tailwind dark/light) + `useTheme`
- [x] Tarea 3: Contratos de datos (`User`, `LeaveRequest`, `Session`, endpoints)
- [x] Tarea 4: Capa de mocks tipada (`mock-data.ts`, `mock-adapter.ts`)

### Checkpoint: Fundaciones
- [x] `npm run typecheck` y `npm run test` corren sin errores (21/21 tests, incluyendo 16 del adaptador de mocks)
- [ ] Una página de prueba puede alternar modo oscuro/claro y leer datos mockeados tipados — pendiente hasta que exista una UI que los consuma (Fase 1-3); la lógica de ambos ya está probada por unidad

### Fase 1 — Módulo `auth`
- [x] Tarea 5: `lib/password-rules.ts` + tests unitarios
- [x] Tarea 6: Login (formulario real + integración con mocks)
- [x] Tarea 7: Olvidé mi contraseña (formulario + confirmación genérica)
- [x] Tarea 8: Definir nueva contraseña (checklist en vivo)
- [x] Tarea 9: Expiración de sesión (2h) + página 404 genérica

### Checkpoint: `auth` completo
- [x] Flujo completo probado a mano: login válido/ inválido, olvidé mi contraseña, definir contraseña, sesión expirada, ruta inexistente → 404 (la variante "por rol" queda pendiente de navegador real hasta la Tarea 15 — sí está cubierta por tests)
- [x] `npm run lint`, `npm run typecheck`, `npm run test` sin errores (81/81)

### Fase 2 — Módulo `shell`
- [x] Tarea 10: `AppShell` + `Topbar` (logo, toggle de tema, dropdown de perfil)
- [ ] Tarea 11: `Sidebar` por rol
- [x] Tarea 12: `useSession` (usuario/rol actual) — hecha antes que 10/11, ver nota en tasks/todo.md

### Checkpoint: `shell` completo
- [ ] Empleado ve sidebar de Empleado; Administrador ve sidebar de Administrador
- [ ] "Cambiar contraseña" desde el dropdown dispara el mismo flujo de confirmación que "Resetear contraseña"

### Fase 3 — Módulos de negocio (paralelizables entre sí)
- [ ] Tarea 13: Dashboard Empleado — tabla de solicitudes propias
- [ ] Tarea 14: Modal "Crear solicitud"
- [ ] Tarea 15: Dashboard Admin — Solicitudes pendientes
- [ ] Tarea 16: Acciones Aprobar/Denegar
- [ ] Tarea 17: Dashboard Admin — Usuarios (tabla + contadores)
- [ ] Tarea 18: Modal "Crear usuario"
- [ ] Tarea 19: Editar usuario
- [ ] Tarea 20: Resetear contraseña + Activar/Desactivar

### Checkpoint: Módulos de negocio completos
- [ ] Los 3 flujos de punta a punta funcionan contra mocks: empleado crea solicitud → admin la aprueba/deniega; admin crea usuario → usuario queda Pendiente
- [ ] Revisión visual contra el mockup publicado (luz y oscuro)

### Fase 4 — Limpieza
- [ ] Tarea 21: Eliminar scaffolding sin uso (`pages/api/hello.ts`, etc.) y pase final de lint/typecheck
- [ ] Tarea 22: QA visual contra el mockup publicado, pantalla por pantalla

### Checkpoint: Completo
- [ ] Todos los criterios de aceptación del `SPEC.md` cumplidos
- [ ] Listo para especificar el backend

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| La capa de mocks diverge del contrato real cuando se spec'ee el backend | Medio | Los contratos (`contracts/interfaces/`) son la única fuente de verdad; se revisan explícitamente al iniciar el spec de backend, no se re-derivan del mock |
| El role-based routing crece en complejidad al no existir SuperAdmin todavía | Bajo | `UserRole` queda como unión de 2 valores; agregar un tercero más adelante es un cambio de tipo acotado, no un rediseño |
| Sin backend real, algunos criterios de aceptación (ej. envío de correo real) no son verificables end-to-end | Medio | Se verifica que el frontend *dispare* la acción correcta contra el mock; la entrega real de correo queda fuera de alcance (ya documentado en `SPEC.md`) |

## Open Questions

- Ninguna abierta por ahora — quedan resueltas en `SPEC.md` (SuperAdmin fuera de alcance, tabs de filtro admin fuera de alcance funcional, mocks tipados como estrategia de datos).
