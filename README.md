# Memo Frontend

Monorepo (npm workspaces) con un SDK reutilizable y agnóstico de plataforma para el juego de memoria multiplayer ([`memo-backend`](https://github.com/nicolopezcesan/memo-backend)), y la web app que lo consume.

Ver [`docs/PRD.md`](docs/PRD.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/adr/`](docs/adr/) para el detalle de producto y las decisiones técnicas.

## Estructura

- `packages/sdk` — cliente TypeScript puro (`socket.io-client` + contrato de eventos + sesión/reconexión), sin React ni DOM.
- `apps/web` — React + Vite + TypeScript + Tailwind + shadcn/ui, consume el SDK.

## Desarrollo local

Requiere [`memo-backend`](https://github.com/nicolopezcesan/memo-backend) corriendo (`docker compose up` en ese repo, por default en `http://localhost:3000`).

```bash
npm install
npm run build -w packages/sdk   # el SDK se consume compilado, no desde src/
cp apps/web/.env.example apps/web/.env   # VITE_BACKEND_URL
npm run dev -w apps/web
```

## Tests

```bash
npm run lint        # oxlint, todos los workspaces
npm run typecheck   # tsc, todos los workspaces
npm run test        # unit (SDK: servidor socket.io de prueba; web: RTL+jsdom)
npm run build        # build real (sdk + vite build)
```

### E2E (Playwright)

Necesita `memo-backend` corriendo de verdad (no hay mock): levanta 2 navegadores simulando a los 2 jugadores, juega una partida completa de punta a punta contra el backend real, y confirma el ganador.

```bash
# en memo-backend: docker compose up (deja Redis en localhost:6379, backend en :3000)
npx playwright install --with-deps chromium -w apps/web   # una sola vez
npm run test:e2e
```

El test lee el deck real directamente de Redis (igual patrón que usa memo-backend en sus propios tests) para scriptear una partida determinística — el backend oculta los símbolos al cliente (anti-cheat), así que no hay otra forma de saber el pairing real desde el browser.

En CI (`.github/workflows/ci.yml`), el job `e2e` clona `memo-backend` (repo público) y lo levanta con su propio `docker compose` antes de correr Playwright.

## Deploy

`apps/web` se despliega a [Vercel](https://vercel.com). `vercel.json` (raíz del repo) ya tiene el build configurado para el monorepo (`npm run build -w packages/sdk && npm run build -w apps/web`, output en `apps/web/dist`).

Pasos manuales (una vez, desde el dashboard de Vercel — requiere la cuenta de Vercel del usuario, no se puede automatizar desde acá):

1. Importar `nicolopezcesan/memo-frontend` como proyecto en Vercel.
2. Root Directory: la raíz del repo (no `apps/web` — el `vercel.json` ya apunta al workspace correcto).
3. Variable de entorno `VITE_BACKEND_URL`: la URL pública de `memo-backend` en producción.
4. Deploy.
