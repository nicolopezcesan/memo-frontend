import type { RoomState } from './domain.js';

export interface RoomCreatePayload {
  nickname: string;
  boardSize: number;
}

export interface RoomCreateResult {
  roomCode: string;
  sessionToken: string;
  playerId: string;
}

export interface RoomJoinPayload {
  roomCode: string;
  nickname: string;
}

export interface RoomJoinResult {
  sessionToken: string;
  playerId: string;
  state: RoomState;
}

// room:start takes no payload - roomCode/playerId are bound to the socket
// connection server-side (memo-backend ADR: identidad atada al socket).
export type RoomStartPayload = Record<string, never>;
export type RoomStartResult = Record<string, never>;

export interface CardFlipPayload {
  cardIndex: number;
}

export type CardFlipResult = Record<string, never>;
