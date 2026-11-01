import type { PlayerState, RoomState } from './domain.js';

export interface RoomPlayerJoinedEvent {
  playerId: string;
  nickname: string;
  players: PlayerState[];
}

export interface GameStartedEvent {
  state: RoomState;
}

export interface CardFlippedEvent {
  cardIndex: number;
  symbol: string;
  byPlayerId: string;
}

export interface TurnResultEvent {
  matched: boolean;
  cardIndices: [number, number];
  scores: Record<string, number>;
}

export interface TurnChangedEvent {
  currentTurnPlayerId: string;
}

export interface PlayerDisconnectedEvent {
  playerId: string;
}

export interface PlayerReconnectedEvent {
  playerId: string;
}

export interface GameEndedEvent {
  scores: Record<string, number>;
  winnerId: string | null;
}

export interface SessionResumedEvent {
  state: RoomState;
  playerId: string;
}

export interface ServerErrorEvent {
  code: string;
  message: string;
}

/** Maps each broadcast event name to its payload type, for a typed on/off. */
export interface BroadcastEventMap {
  'room:playerJoined': RoomPlayerJoinedEvent;
  'game:started': GameStartedEvent;
  'card:flipped': CardFlippedEvent;
  'turn:result': TurnResultEvent;
  'turn:changed': TurnChangedEvent;
  'player:disconnected': PlayerDisconnectedEvent;
  'player:reconnected': PlayerReconnectedEvent;
  'game:ended': GameEndedEvent;
  'session:resumed': SessionResumedEvent;
  error: ServerErrorEvent;
}
