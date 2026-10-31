# 0001 — Monorepo con SDK agnóstico de plataforma, separado de la web app

## Status
Aceptado

## Contexto
El pedido explícito fue que el cliente quede reutilizable a futuro (posible SDK publicable, posible cliente React Native), no solo una web app.

## Decisión
Monorepo (npm workspaces): `packages/sdk` (TypeScript puro, sin React ni DOM, solo `socket.io-client` + contrato de eventos + sesión/reconexión) y `apps/web` (React + Vite, consume el SDK). React Native queda fuera de alcance de este ciclo, pero el SDK se diseña desde el día 1 sin nada específico de browser (ver ADR 0002 sobre storage).

## Consecuencias
- Positivo: agregar un cliente mobile a futuro es agregar una `apps/mobile` nueva que consume el mismo SDK, no reescribir la lógica de conexión/sesión.
- Negativo: una capa de indirección (SDK) que una app single-platform no necesitaría; se acepta porque la reusabilidad fue un requisito explícito, no una especulación propia.
