# Architecture — Memo Frontend

## Stack

- Monorepo con npm workspaces: `packages/sdk/`, `apps/web/`.
- `packages/sdk`: TypeScript puro, `socket.io-client` como única dependencia de transporte. Sin React, sin DOM — debe poder usarse desde cualquier entorno JS (browser hoy, React Native a futuro).
- `apps/web`: React + Vite + TypeScript, Tailwind CSS + shadcn/ui, React Router (código de sala en la URL), Context + hooks propios sobre el SDK.
- Testing: Vitest (SDK, contra un servidor socket.io de prueba propio) + Playwright (e2e de la web contra el backend real).
- Deploy: Vercel para `apps/web`.

## `packages/sdk`

### Contrato de eventos

Espeja exactamente el contrato de `memo-backend` (`docs/ARCHITECTURE.md` de ese repo). Se mantiene sincronizado a mano — no hay un paquete de tipos compartido entre los dos repos todavía; si el contrato del backend cambia, hay que actualizar los tipos acá también.

Cliente -> Servidor (ack): `room:create`, `room:join`, `room:start`, `card:flip`.
Servidor -> Sala (broadcast): `room:playerJoined`, `game:started`, `card:flipped`, `turn:result`, `turn:changed`, `player:disconnected`, `player:reconnected`, `game:ended`, `session:resumed`, `error`.

### `GameClient`

- `connect(url, { sessionToken? })`: abre el socket, manda `sessionToken` en `handshake.auth` si existe uno guardado.
- `createRoom({nickname, boardSize})`, `joinRoom({roomCode, nickname})`, `startGame()`, `flipCard({cardIndex})`: métodos async que devuelven un resultado tipado `{ok:true, ...} | {ok:false, code, message}` (igual forma que el ack del backend).
- `on(event, handler)` / `off(event, handler)`: suscripción a los eventos de broadcast, tipada por evento.
- Al recibir `session:resumed` o un ack exitoso de `createRoom`/`joinRoom`, persiste `{sessionToken, roomCode, playerId}` vía el `SessionStorage` inyectado.
- Al reconectar (`connect()` llamado de nuevo, ej. tras un refresh de página), si hay sesión guardada la manda en el handshake automáticamente.

### `SessionStorage` (abstracción de persistencia)

```ts
interface SessionStorage {
  get(): Promise<StoredSession | null>;
  set(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}
```

`packages/sdk` expone un `createLocalStorageSession()` (implementación default para browser) pero `GameClient` no importa `localStorage` directamente en ningún lado — recibe el `SessionStorage` por constructor. Un cliente mobile futuro pasa un adapter de `AsyncStorage` sin tocar el SDK.

## `apps/web`

- `GameClientProvider`: instancia un `GameClient` (con `createLocalStorageSession()`), lo expone por Context.
- `useGameClient()`: acceso al cliente para disparar acciones.
- `useRoomState()`: se suscribe a los eventos de broadcast relevantes y expone el `RoomState` actual + estado de conexión (`connected`/`disconnected`/`reconnecting`) como un hook reactivo.
- Rutas: `/` (lobby: crear o unirse), `/room/:code` (sala — renderiza esperando-jugador o tablero según `status`).

## Riesgos conocidos

- El contrato de eventos vive duplicado entre los dos repos (backend y SDK). Si se desalinean, los tests e2e de Playwright (que corren contra el backend real) son los que lo detectan.
