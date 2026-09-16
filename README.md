# MyOwnSpace

Herramienta interna de DevTech para gestionar solicitudes de permiso (empleado) y su aprobación/denegación (administrador).

Este repo contiene el **frontend** (Next.js 13 + TypeScript, Pages Router), construido contra una capa de mocks tipada mientras no existe backend real. Ver `SPEC.md` para el alcance y las reglas de negocio, y `tasks/plan.md` / `tasks/todo.md` para el detalle de implementación.

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

## Estructura

- `src/pages/` — rutas (Next.js Pages Router)
- `src/components/` — componentes, organizados por página (`pages/`), layout (`layout/`) y reutilizables (`common/`)
- `src/services/` — capa de servicios (`*.api.ts`) y su implementación mock (`services/mocks/`)
- `src/contracts/` — contratos de datos compartidos (`User`, `LeaveRequest`, `Session`, etc.)
