# Cambios: PTO con reclamo de horas

**Fecha:** 05/10/2026
**Rama:** `chore/nextjs-16-migration`, fusionada en `Develop` (PR #4).

## Estado

- **Commit:** `04ab0e7` (`feat: claim-based PTO model`), en `Develop`. Las correcciones posteriores del code review (2026-10-06) están en los PR #5 a #9.
- **Verificación al momento del commit:**
  - Backend: 132 tests pasan.
  - Frontend: 285 tests pasan, también con `TZ=America/El_Salvador`.
  - Typecheck y lint sin errores (quedan 2 advertencias que ya existían).
  - Prueba real contra el API: 13 de 13 pasos correctos.
- **Probado después en el navegador** (2026-10-06), con la API real, incluido un video de demostración.
- **Migración:** `AddPtoClaims`. Para aplicarla en otro ambiente, ver "Actualizar un ambiente existente" en `OwnSpaceAPI/README.md`.

## Reglas implementadas

Fuente: notas en `MEJORAS.md` y Código de Trabajo de El Salvador, art. 177 a 180.

| # | Regla |
|---|---|
| R1 | Cada quincena trabajada (cortes del día 15 y del fin de mes) suma **5 h** a **Acumuladas**. |
| R2 | El botón **"Reclamar"** pasa todo lo acumulado a **Reclamadas**. |
| R3 | Lo acumulado que no se reclamó se **pierde el 1 de enero**. |
| R4 | Lo reclamado **nunca vence**. |
| R5 | Cada hora pertenece al **año laboral en que se ganó** (por aniversario de ingreso) y se **habilita al cerrar ese año**. |
| R6 | Un año laboral habilita sus horas solo si tuvo **≥ 200 días trabajados** (art. 180). Si no llega, sus horas quedan bloqueadas hasta que se cierre un año que sí cumpla. |
| R7 | Días trabajados = días hábiles (lunes a viernes) − ausencias **aprobadas de día completo** (enfermedad, emergencia, permisos). Las vacaciones no cuentan como ausencia. |
| R8 | Las vacaciones descuentan **solo lunes a viernes, a 8 h por día**, y **no pueden empezar** en sábado ni domingo (art. 178). |
| R9 | **Disponible** = reclamadas habilitadas − vacaciones aprobadas − vacaciones pendientes (las pendientes apartan saldo). |

Todo se calcula al vuelo, sin procesos programados.

## Cambios en la API

| Endpoint | Tipo | Qué hace |
|---|---|---|
| `GET /pto/balance` | Respuesta nueva | Devuelve `horasDisponibles`, `horasAcumuladas`, `horasReclamadasBloqueadas`, `fechaProximaHabilitacion`, `diasTrabajadosAnioLaboral`, `diasTrabajadosMinimos` y `fechaLimiteReclamo`. |
| `POST /pto/claim` | **Nuevo** | Reclama lo acumulado. Responde 400 si no hay nada que reclamar. |
| `POST /pto/vacation-requests` | **Nuevo** | Vacaciones por rango. Crea la solicitud como **Pendiente**. Responde 400 o 409 según la regla que falle. |
| `POST /pto/requests` | Sin cambio de forma | Reserva de un día. Ahora valida contra el disponible nuevo y rechaza fechas que se crucen con un rango. |
| `POST /requests/{id}/approve` | Comportamiento nuevo | Si la solicitud es de Vacaciones, vuelve a validar el saldo. Responde 409 si ya no alcanza. |
| Respuestas de solicitudes | Aditivo | Ahora incluyen `horasSolicitadas` (faltaba). |

**Base de datos:** tabla nueva `PtoClaims` (`Id`, `EmployeeId`, `CorteDesde`, `CorteHasta`, `Horas`, `CreatedAt`), con índice `(EmployeeId, CorteHasta)` y la validación `CorteHasta >= CorteDesde`.

## Archivos principales

**Backend (`OwnSpaceAPI/src/OwnSpaceAPI.Api/`)**
- `Services/Pto/PtoBalanceCalculator.cs`: reglas R1 a R8, como funciones puras.
- `Services/Pto/PtoBalanceService.cs`: saldo y reclamo. Recibe `TimeProvider` inyectado para fijar "hoy" en los tests.
- `Services/Pto/PtoRequestsService.cs`: solicitud por rango y validación de cruces de fechas.
- `Services/Requests/RequestsService.cs`: validación de saldo al aprobar.
- `Models/Entities/PtoClaim.cs` y `Data/Migrations/20261005165435_AddPtoClaims.cs`.
- `Program.cs`: registra `TimeProvider.System`.

**Frontend (`src/`)**
- `lib/pto-balance-calculator.ts`: copia del calculador en TypeScript. **Hay que mantenerlo igual al de C#.**
- `pages/pto.tsx`: tres tarjetas (Acumuladas con "Reclamar", Reclamadas por habilitar, Disponibles).
- `components/pages/pto/VacationRangeModal.tsx`: formulario por rango, con el cálculo de días hábiles antes de enviar.
- `components/pages/pto/PtoCalendar.tsx`: marca los rangos completos; las pendientes en ámbar.
- `services/mocks/`: el mock replica las reglas, con reclamos de ejemplo para `u3` y `u4`.
- `helpers/error-message.ts`: muestra el mensaje real del servidor en lugar de "Request failed…".

**Documentación:** `docs/manual-usuario.md` y `docs/guia-tecnica.md`, actualizados.

## Errores previos corregidos de paso

1. **Fechas corridas un día** en las tablas de solicitudes cuando se usa la hora de El Salvador (UTC−6).
2. **"undefinedh"** en la tabla "PTO del equipo" del administrador con el API real.
3. **Botón de pantalla completa** que decía "Salir" sin estar activo, en navegadores sin esa función (por ejemplo, Safari en iPhone).
4. **Voseo restante** en el manual ("Si sos…").
5. La pantalla del administrador ahora muestra el **motivo real** cuando falla una aprobación, y los rangos aparecen en **todos los meses** que abarcan.

## Datos de prueba en la base local

| Usuario | Rol | Estado |
|---|---|---|
| `empleado.pruebas@devtch.com` | Empleado (ingreso 15/01/2024) | Reclamo del año anterior cargado a mano (120 h), 90 h reclamadas por habilitar y vacaciones aprobadas del 15 al 20/10/2026. Disponible: 88 h. |
| `admin.pruebas@devtch.com` | Administrador | Sin cambios. |

Las contraseñas no se guardan en el repositorio: pedirlas a quien hizo las pruebas. Son cuentas solo para pruebas locales: cambiar las contraseñas o desactivarlas si la base se usa para algo más.

## Limitaciones conocidas

- **Asuetos:** no hay calendario de feriados; solo se excluyen los fines de semana.
- **"Hoy" se calcula en UTC.** Después de las 6 p. m. en El Salvador, el sistema ya toma el día siguiente. Pasaba lo mismo antes de este cambio.
- **Saldos de partida:** nadie tenía reclamos, así que todos empiezan con 0 disponible y con lo acumulado en 2026 pendiente de reclamar. No se migraron saldos.
- **Remuneración** (30 % adicional, art. 183 a 185): queda fuera del sistema.

## Para retomar

1. Revisar y hacer el commit de los cambios pendientes, sobre el respaldo `20bd9b5`.
2. Probar en el navegador: `npm run dev` en `MyOwnSpace/` y `dotnet run --project src/OwnSpaceAPI.Api --launch-profile https` en `OwnSpaceAPI/`. Entrar como `empleado.pruebas` y como `admin.pruebas`.
3. Si se despliega en otro entorno: aplicar la migración con `dotnet ef database update`.
