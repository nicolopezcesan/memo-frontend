import type {
  CardFlippedEvent,
  GameEndedEvent,
  PlayerDisconnectedEvent,
  PlayerLeftEvent,
  PlayerReconnectedEvent,
  PlayerState,
  RoomPlayerJoinedEvent,
  RoomState,
  TurnChangedEvent,
  TurnResultEvent,
} from '@memo/sdk';
import { useEffect, useReducer, useState } from 'react';
import { useGameClient } from '../providers/game-client-provider.js';

// How long a non-matching pair stays face up before hiding again, so the
// players actually get to see what was flipped.
const MISMATCH_HIDE_DELAY_MS = 800;

type RoomAction =
  | { type: 'playerJoined'; players: PlayerState[] }
  | { type: 'roomState'; state: RoomState }
  | { type: 'cardFlipped'; cardIndex: number; symbol: string }
  | { type: 'hideCards'; cardIndices: number[] }
  | { type: 'turnResult'; matched: boolean; cardIndices: [number, number]; scores: Record<string, number> }
  | { type: 'turnChanged'; currentTurnPlayerId: string }
  | { type: 'gameEnded'; scores: Record<string, number> }
  | { type: 'connectivity'; playerId: string; connected: boolean };

function applyScores(players: PlayerState[], scores: Record<string, number>): PlayerState[] {
  return players.map((player) => ({ ...player, score: scores[player.playerId] ?? player.score }));
}

function reducer(state: RoomState | null, action: RoomAction): RoomState | null {
  if (!state && action.type !== 'roomState') return state;

  switch (action.type) {
    case 'roomState':
      return action.state;
    case 'playerJoined':
      return { ...state!, players: action.players };
    case 'cardFlipped':
      return {
        ...state!,
        deck: state!.deck.map((card, index) =>
          index === action.cardIndex ? { ...card, symbol: action.symbol } : card,
        ),
      };
    case 'hideCards':
      return {
        ...state!,
        deck: state!.deck.map((card, index) =>
          action.cardIndices.includes(index) ? { ...card, symbol: null } : card,
        ),
      };
    case 'turnResult': {
      const players = applyScores(state!.players, action.scores);
      const deck = action.matched
        ? state!.deck.map((card, index) =>
            action.cardIndices.includes(index) ? { ...card, matched: true } : card,
          )
        : state!.deck;
      return { ...state!, players, deck };
    }
    case 'turnChanged':
      return { ...state!, currentTurnPlayerId: action.currentTurnPlayerId };
    case 'gameEnded':
      return { ...state!, status: 'finished', players: applyScores(state!.players, action.scores) };
    case 'connectivity':
      return {
        ...state!,
        players: state!.players.map((player) =>
          player.playerId === action.playerId
            ? { ...player, connected: action.connected }
            : player,
        ),
      };
    default:
      return state;
  }
}

export interface GameEndedResult {
  winnerId: string | null;
}

export interface RoomStateHook {
  state: RoomState | null;
  gameResult: GameEndedResult | null;
  /** Set once the other player leaves on purpose (room:leave) - the room
   * is gone server-side at that point, so this is shown instead of the
   * board rather than alongside it. */
  playerLeft: PlayerLeftEvent | null;
}

export function useRoomState(initialState: RoomState | null = null): RoomStateHook {
  const client = useGameClient();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [gameResult, setGameResult] = useState<GameEndedResult | null>(null);
  const [playerLeft, setPlayerLeft] = useState<PlayerLeftEvent | null>(null);

  useEffect(() => {
    const handlePlayerJoined = (payload: RoomPlayerJoinedEvent) => {
      dispatch({ type: 'playerJoined', players: payload.players });
    };
    const handleGameStarted = (payload: { state: RoomState }) => {
      dispatch({ type: 'roomState', state: payload.state });
    };
    const handleSessionResumed = (payload: { state: RoomState }) => {
      dispatch({ type: 'roomState', state: payload.state });
    };
    const handleCardFlipped = (payload: CardFlippedEvent) => {
      dispatch({ type: 'cardFlipped', cardIndex: payload.cardIndex, symbol: payload.symbol });
    };
    const handleTurnResult = (payload: TurnResultEvent) => {
      dispatch({ type: 'turnResult', ...payload });
      if (!payload.matched) {
        setTimeout(
          () => dispatch({ type: 'hideCards', cardIndices: payload.cardIndices }),
          MISMATCH_HIDE_DELAY_MS,
        );
      }
    };
    const handleTurnChanged = (payload: TurnChangedEvent) => {
      dispatch({ type: 'turnChanged', currentTurnPlayerId: payload.currentTurnPlayerId });
    };
    const handleGameEnded = (payload: GameEndedEvent) => {
      dispatch({ type: 'gameEnded', scores: payload.scores });
      setGameResult({ winnerId: payload.winnerId });
    };
    const handlePlayerDisconnected = (payload: PlayerDisconnectedEvent) => {
      dispatch({ type: 'connectivity', playerId: payload.playerId, connected: false });
    };
    const handlePlayerReconnected = (payload: PlayerReconnectedEvent) => {
      dispatch({ type: 'connectivity', playerId: payload.playerId, connected: true });
    };
    const handlePlayerLeft = (payload: PlayerLeftEvent) => {
      setPlayerLeft(payload);
    };

    client.on('room:playerJoined', handlePlayerJoined);
    client.on('game:started', handleGameStarted);
    client.on('session:resumed', handleSessionResumed);
    client.on('card:flipped', handleCardFlipped);
    client.on('turn:result', handleTurnResult);
    client.on('turn:changed', handleTurnChanged);
    client.on('game:ended', handleGameEnded);
    client.on('player:disconnected', handlePlayerDisconnected);
    client.on('player:reconnected', handlePlayerReconnected);
    client.on('player:left', handlePlayerLeft);

    return () => {
      client.off('room:playerJoined', handlePlayerJoined);
      client.off('game:started', handleGameStarted);
      client.off('session:resumed', handleSessionResumed);
      client.off('card:flipped', handleCardFlipped);
      client.off('turn:result', handleTurnResult);
      client.off('turn:changed', handleTurnChanged);
      client.off('game:ended', handleGameEnded);
      client.off('player:disconnected', handlePlayerDisconnected);
      client.off('player:reconnected', handlePlayerReconnected);
      client.off('player:left', handlePlayerLeft);
    };
  }, [client]);

  return { state, gameResult, playerLeft };
}
