# Traspaso — MyOwnSpace

Estado del proyecto al 2026-10-15, para quien lo continúe. Este documento no repite lo que ya está en otros lados: te dice qué leer, qué reglas seguir y qué falta.

## Estado actual

Todo lo construido está en `Develop` (PR #1 a #23). `main` está muy atrás (unos 90 commits) y todavía no se liberó una versión desde `Develop`.

La aplicación cubre:

- **Empleado:** solicitudes de permiso, saldo de vacaciones (acumuladas → reclamadas → habilitadas → disponibles) y solicitudes de vacaciones.
- **Administrador:** aprobar o denegar solicitudes, gestionar usuarios, ver el PTO del equipo por mes y revisar la bitácora (**Auditoría**: acciones de administradores, inicios y cierres de sesión, intentos fallidos).
- **Sesión:** JWT en cookie httpOnly, cierre por inactividad, "Olvidé mi contraseña" con contraseña temporal por correo (Resend), límites de intentos por IP y por usuario.

## Qué leer

| Para… | Lee |
|---|---|
| Levantar el proyecto y desplegarlo | [`README.md`](../README.md) y [`OwnSpaceAPI/README.md`](../OwnSpaceAPI/README.md) |
| Saber qué endpoint existe y dónde tocar cada entidad | [`docs/guia-tecnica.md`](guia-tecnica.md) |
| El contrato exacto de la API | [`OwnSpaceAPI/docs/openapi.yaml`](../OwnSpaceAPI/docs/openapi.yaml) |
| Cómo se usa la aplicación | [`docs/manual-usuario.md`](manual-usuario.md) |
| Alcance y reglas de negocio | [`SPEC.md`](../SPEC.md) y [`OwnSpaceAPI/SPEC.md`](../OwnSpaceAPI/SPEC.md) |
| Por qué se decidió cada cosa | [`tasks/todo.md`](../tasks/todo.md) y [`OwnSpaceAPI/tasks/todo.md`](../OwnSpaceAPI/tasks/todo.md) |
| Mejoras pedidas por el negocio y qué no tocar | [`MEJORAS.md`](../MEJORAS.md) |

## Reglas del proyecto

- **Paleta institucional (obligatoria):** azul pizarra `#637694` (escala `brand-*`, color principal) y malva `#79708d` (escala `mauve-*`, secundario), definidos en `src/styles/globals.css`. El fondo de cada pantalla usa `bg-textura`. Todo color de acento nuevo sale de esas escalas, nunca de un hex fijo; verifica el contraste (texto blanco solo sobre el tono 500 o más oscuro).
- **Español neutro con tuteo, sin voseo**, en la interfaz, los mensajes de error, los comentarios y la documentación. El dominio va en español (`Nombre`, `Estado`); lo técnico, en inglés (`Controller`, `Service`).
- **Seguridad:** nunca "no tienes permiso" (un rol no permitido recibe un 404 genérico, en el backend y en el frontend) y nunca revelar si un correo está registrado.
- **Un cambio de contrato se hace en los tres lados:** el backend, `src/contracts/interfaces/` y el mock (`src/services/mocks/mock-adapter.ts`). Muchos tests corren en modo mock.
- **Reglas de PTO:** el backend es la fuente de verdad. Al cambiar una regla, ajusta el caso en `test-data/pto-calculadora-casos.json` y cambia las dos implementaciones (C# y la del mock).
- **"Hoy" es la fecha de El Salvador (UTC−6):** `TimeProvider.HoyLocal()` en el backend y `hoyIso()` en el frontend.
- **Bitácora:** `RegistrarAsync` se llama antes del `SaveChangesAsync` de la operación, para que quede en el mismo commit.
- **No tocar lo que funciona** (`MEJORAS.md`, "Restringido"): ningún endpoint que funcione, salvo errores graves.

## Antes de desplegar

- **Aplica las migraciones antes de desplegar el backend.** Desde `AddAccesosAuditLog`, cada login escribe en la bitácora: sin esa migración, **todos los logins responden 500**. Pasos en [`OwnSpaceAPI/README.md`](../OwnSpaceAPI/README.md#actualizar-un-ambiente-existente).
- **Correos:** sin un dominio verificado en Resend, en producción los correos (contraseñas temporales) no llegan a los empleados.
- **CI:** `.github/workflows/ci.yml` corre lint, typecheck, tests y build en cada PR, pero no hay checks obligatorios en GitHub: un ❌ no bloquea el merge. Revísalo antes de mergear.
- **Cuentas del video de demostración:** `admin@mail.com` y `empleado@mail.com` en la base local. No las borres ni les cambies la contraseña.

## Pendientes, por prioridad

1. **Liberar `Develop` → `main`.** Además cierra la mayoría de las alertas de Dependabot, que vienen del código inicial de `main`.
2. **Verificar un dominio en Resend.**
3. **Bitácora:** retención de registros e índice `(Accion, CreatedAt)` (juntos, cuando la tabla crezca); IP en los intentos fallidos (decisión de privacidad); filtro por usuario en la pantalla.
4. **Outbox de correos:** hoy la cola es en memoria y se pierde si la API se reinicia.
5. **Asuetos:** las vacaciones solo descuentan días hábiles de lunes a viernes; no hay calendario de feriados.
6. **Tests end-to-end.**
7. **`npm audit`:** lo que queda es de jest y del plugin de ESLint (solo desarrollo). Espera versiones corregidas; no uses `npm audit fix --force`.

## Archivos locales que no están en el repo

`CLAUDE.md` y `AGENTS.md` están en `.gitignore`: eran las instrucciones para el asistente de código usado en el proyecto. Las reglas de este documento salen de ahí. Si usas un asistente, créalos de nuevo a partir de esta sección.
