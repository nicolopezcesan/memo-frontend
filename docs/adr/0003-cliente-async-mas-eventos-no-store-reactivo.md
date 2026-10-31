# 0003 — SDK como cliente async + eventos, no un store reactivo

## Status
Aceptado

## Contexto
Había dos formas razonables de exponer la API del SDK: (a) métodos async + eventos de broadcast, mapeando 1:1 el contrato ack/broadcast del backend, o (b) un store ya reducido (tipo Zustand armado) con el estado completo de la sala.

## Decisión
El SDK expone métodos async (`createRoom`, `joinRoom`, `startGame`, `flipCard`) que devuelven el resultado del ack, y un `on`/`off` para los eventos de broadcast. No mantiene ni reduce estado de UI por su cuenta — eso lo hace `apps/web` (`useRoomState`, ver ARCHITECTURE.md).

## Consecuencias
- Positivo: el SDK es reusable por cualquier consumidor (React, React Native, un script de Node) sin atarse a un patrón de estado particular; mapea directo con el contrato del backend, fácil de tipar y de mantener sincronizado.
- Negativo: cada consumidor (como `apps/web`) tiene que escribir su propia capa de reducción de estado sobre los eventos; se acepta porque es poco código y mantiene al SDK desacoplado de cualquier librería de UI/estado.
