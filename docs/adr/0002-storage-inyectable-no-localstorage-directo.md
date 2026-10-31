# 0002 — Storage de sesión inyectable, no `localStorage` directo en el SDK

## Status
Aceptado

## Contexto
El SDK necesita persistir `{sessionToken, roomCode, playerId}` para poder reconectar tras un refresh de página (ver backend ADR 0002 sobre sesiones). `localStorage` es específico de browser; React Native usa `AsyncStorage`, con API asíncrona distinta.

## Decisión
`GameClient` recibe una interfaz `SessionStorage` (`get/set/clear`, todos async) por constructor, nunca accede a `localStorage` directamente. `packages/sdk` exporta `createLocalStorageSession()` como implementación default para `apps/web`. Un cliente mobile futuro pasa su propio adapter sobre `AsyncStorage` sin modificar el SDK.

## Consecuencias
- Positivo: el SDK sigue siendo agnóstico de plataforma (cumple la ADR 0001) incluso para la parte de persistencia, que es la más tentadora de hardcodear contra el browser.
- Negativo: una interfaz más para implementar en vez de llamar a `localStorage` directo; costo mínimo, ya que la implementación default la da el propio SDK.
