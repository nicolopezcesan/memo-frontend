// Mirrors memo-backend's PublicRoomState (src/game-engine/public-state.ts)
// exactly: symbols are null until matched/flipped, and players never carry
// a sessionId. Keep this in sync by hand if that contract changes.

export interface Card {
  symbol: string | null;
  matched: boolean;
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PlayerState {
  playerId: string;
  nickname: string;
  score: number;
  connected: boolean;
}

export interface RoomState {
  code: string;
  status: RoomStatus;
  boardSize: number;
  deck: Card[];
  flippedIndices: number[];
  currentTurnPlayerId: string;
  players: PlayerState[];
  createdAt: number;
}
