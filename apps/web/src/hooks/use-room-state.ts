import type { RoomState } from '@memo/sdk';
import { useEffect, useState } from 'react';
import { useGameClient } from '../providers/game-client-provider.js';

export type ConnectionStatus = 'connected' | 'disconnected';

export interface RoomStateHook {
  state: RoomState | null;
  connectionStatus: ConnectionStatus;
}

/**
 * Minimal baseline: tracks the RoomState delivered by game:started/
 * session:resumed. card:flip/turn/disconnect handling is added on top of
 * this in epics 8 and 9 as those features get built.
 */
export function useRoomState(): RoomStateHook {
  const client = useGameClient();
  const [state, setState] = useState<RoomState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    client.connected ? 'connected' : 'disconnected',
  );

  useEffect(() => {
    const handleGameStarted = (payload: { state: RoomState }) => {
      setState(payload.state);
    };
    const handleSessionResumed = (payload: { state: RoomState }) => {
      setState(payload.state);
      setConnectionStatus('connected');
    };

    client.on('game:started', handleGameStarted);
    client.on('session:resumed', handleSessionResumed);

    return () => {
      client.off('game:started', handleGameStarted);
      client.off('session:resumed', handleSessionResumed);
    };
  }, [client]);

  return { state, connectionStatus };
}
