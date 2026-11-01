import type { ServerErrorEvent } from '@memo/sdk';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGameClient } from '../providers/game-client-provider.js';

/** Sends the player back to the lobby if their session turns out to be dead. */
export function useSessionInvalidRedirect(): void {
  const client = useGameClient();
  const navigate = useNavigate();

  useEffect(() => {
    const handleError = (payload: ServerErrorEvent) => {
      if (payload.code === 'SESSION_INVALID') {
        void navigate('/', { replace: true });
      }
    };
    client.on('error', handleError);
    return () => client.off('error', handleError);
  }, [client, navigate]);
}
