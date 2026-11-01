import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useGameClient } from '../providers/game-client-provider.js';

/**
 * Connects the socket as soon as the app mounts, on every page - without
 * this, a page refresh on /room/:code never reconnects (no call ever
 * reaches GameClient.connect()) and the room hangs on "loading" forever.
 * If a stored session already exists and the user lands on the lobby
 * (fresh tab, already mid-game), redirect straight back into the room.
 */
export function useAutoResume(): void {
  const client = useGameClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    client
      .connect()
      .then(() => {
        if (cancelled || location.pathname !== '/') return;
        const session = client.session;
        if (session) {
          void navigate(`/room/${session.roomCode}`, { replace: true });
        }
      })
      .catch(() => {
        // No backend reachable on initial load: the lobby's own connect()
        // call (idempotent) retries when the user actually submits a form.
      });
    return () => {
      cancelled = true;
    };
    // location.pathname/navigate intentionally excluded: this should run
    // once on mount per client, not re-run on every navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);
}
