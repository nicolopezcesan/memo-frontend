# CLAUDE.md

Guía de trabajo para este repo. Ver `docs/PRD.md`, `docs/ARCHITECTURE.md` y `docs/adr/` para contexto de producto y decisiones técnicas. Backend: [`memo-backend`](https://github.com/nicolopezcesan/memo-backend) (contrato de eventos en su `docs/ARCHITECTURE.md`).

## Stack

Monorepo npm workspaces: `packages/sdk` (TS puro, sin React/DOM) + `apps/web` (React + Vite + TS, Tailwind + shadcn/ui, React Router).

## Convenciones

- `packages/sdk` nunca importa nada de React, DOM, ni `localStorage` directo — ver ADR 0001/0002. Cualquier dependencia de plataforma entra por una interfaz inyectada.
- El contrato de eventos en `packages/sdk` debe espejar exactamente el de `memo-backend`. Si cambia uno, cambia el otro a mano (no hay paquete de tipos compartido entre repos).
- `apps/web` consume el SDK solo a través de `useGameClient()`/`useRoomState()`, nunca instancia `GameClient` directo fuera del Provider.

## Comandos

- `npm install` (raíz) — instala todo el workspace.
- `npm run dev -w apps/web` — levanta la web app en dev.
- `npm run test -w packages/sdk` — unit tests del SDK (Vitest, contra servidor socket.io de prueba).
- `npm run test:e2e -w apps/web` — e2e (Playwright) contra el backend real.
- `npm run lint` / `npm run build` (raíz) — corre en todos los workspaces.

## Flujo de trabajo con issues

1. Al tomar un issue: asignártelo y moverlo a **In progress** en el Project.
2. Crear rama `feat/<n>-<slug>`.
3. Abrir PR con `Closes #<n>`, mover el issue a **In review**.
4. No tomar issues con label `status:blocked` ni con dependencias (`#N`) todavía abiertas.
5. Solo tomar issues en `ready-for-claude` sin dependencias pendientes.
