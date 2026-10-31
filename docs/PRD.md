# PRD — Memo Frontend

## Objetivo

Monorepo con un SDK reutilizable y agnóstico de plataforma para el juego de memoria multiplayer ([`memo-backend`](https://github.com/nicolopezcesan/memo-backend)), y una web app que lo consume para jugar desde el navegador. El SDK se diseña para que, en un ciclo futuro, un cliente mobile (React Native) pueda reusarlo sin modificarlo.

## Usuarios

- Dos jugadores anónimos jugando desde el navegador, igual que en el backend: uno crea sala, el otro se une con el código (o un link con el código en la URL).
- A futuro: cualquier desarrollador que quiera consumir el SDK para construir su propio cliente (web, mobile, u otro).

## Alcance

- **`packages/sdk`**: cliente TypeScript puro que envuelve `socket.io-client`, expone métodos async (`createRoom`, `joinRoom`, `startGame`, `flipCard`) y eventos de broadcast tipados, maneja sesión/reconexión vía una interfaz de storage inyectable (sin depender de `localStorage` directamente).
- **`apps/web`**: React + Vite + TypeScript + Tailwind + shadcn/ui, consume el SDK. Pantallas: lobby (crear/unirse), sala esperando jugador, tablero de juego, estados de desconexión/reconexión.
- Ruteo con código de sala en la URL (`/room/:code`) para poder compartir el link de invitación.
- Tests: unit (Vitest) para el SDK contra un servidor de prueba propio; e2e (Playwright) para la web contra el backend real, con 2 navegadores simulando a los 2 jugadores.
- Deploy de `apps/web` a Vercel.

## Fuera de alcance

- Cliente mobile (React Native): el SDK se diseña para soportarlo a futuro, pero no se construye en este ciclo.
- Publicación del SDK en npm (queda preparado para eso, no se publica todavía).
- Cualquier feature de backend no soportada por `memo-backend` (matchmaking automático, cuentas, etc. — ver su propio PRD).

## Criterio de éxito del MVP

Dos personas en dos navegadores distintos pueden: abrir la web, una crea sala y comparte el link, la otra entra y se une, juegan una partida completa de punta a punta viendo turnos/puntajes/ganador, y si una se desconecta y recarga la página puede retomar la partida.
