import type { RoomState } from '@memo/sdk';
import { useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { Button } from '../components/ui/button.js';
import { useRoomState } from '../hooks/use-room-state.js';
import { useSessionInvalidRedirect } from '../hooks/use-session-invalid-redirect.js';
import { useGameClient } from '../providers/game-client-provider.js';

const BOARD_COLUMNS: Record<number, number> = { 16: 4, 24: 6, 36: 6 };

export function Room() {
  const { code } = useParams<{ code: string }>();
  const location = useLocation();
  const client = useGameClient();
  const { state, gameResult } = useRoomState((location.state as RoomState | null) ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  useSessionInvalidRedirect();

  if (!state) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p>Cargando sala {code}…</p>
      </main>
    );
  }

  const myPlayerId = client.session?.playerId;
  const isHost = state.players[0]?.playerId === myPlayerId;
  const isMyTurn = state.currentTurnPlayerId === myPlayerId;
  const canStart = state.status === 'waiting' && state.players.length === 2 && isHost;

  async function handleStart() {
    setActionError(null);
    const result = await client.startGame();
    if (!result.ok) setActionError(result.message);
  }

  async function handleFlip(cardIndex: number) {
    const card = state!.deck[cardIndex];
    if (state!.status !== 'playing' || !isMyTurn || card.matched || card.symbol !== null) {
      return;
    }
    setActionError(null);
    const result = await client.flipCard({ cardIndex });
    if (!result.ok) setActionError(result.message);
  }

  return (
    <main className="flex min-h-svh flex-col items-center gap-6 p-6">
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm text-muted-foreground">Sala</p>
        <h1 className="text-2xl font-semibold">{state.code}</h1>
      </header>

      <section className="flex gap-6">
        {state.players.map((player) => (
          <div
            key={player.playerId}
            className={
              state.status === 'playing' && player.playerId === state.currentTurnPlayerId
                ? 'font-semibold text-primary'
                : undefined
            }
          >
            {player.nickname}: {player.score}
            {state.status === 'playing' && player.playerId === state.currentTurnPlayerId && (
              <span> (turno)</span>
            )}
          </div>
        ))}
      </section>

      {state.players
        .filter((player) => player.playerId !== myPlayerId && !player.connected)
        .map((player) => (
          <p key={player.playerId} className="text-sm text-muted-foreground">
            {player.nickname} se desconectó. Esperando a que vuelva…
          </p>
        ))}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {state.status === 'waiting' && (
        <div className="flex flex-col items-center gap-3">
          {state.players.length < 2 ? (
            <p>Esperando al otro jugador…</p>
          ) : (
            <p>Listos para empezar.</p>
          )}
          {canStart && <Button onClick={() => void handleStart()}>Empezar partida</Button>}
        </div>
      )}

      {state.status !== 'waiting' && (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `repeat(${BOARD_COLUMNS[state.boardSize] ?? 4}, minmax(0, 1fr))`,
          }}
        >
          {state.deck.map((card, index) => (
            <button
              key={index}
              type="button"
              onClick={() => void handleFlip(index)}
              disabled={state.status !== 'playing' || !isMyTurn || card.matched}
              className="flex size-16 items-center justify-center rounded-lg border bg-card text-lg font-semibold disabled:cursor-default"
            >
              {card.symbol ?? ''}
            </button>
          ))}
        </div>
      )}

      {gameResult && (
        <div className="flex flex-col items-center gap-2 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">
            {gameResult.winnerId === null
              ? 'Empate'
              : gameResult.winnerId === myPlayerId
                ? '¡Ganaste!'
                : 'Perdiste'}
          </h2>
        </div>
      )}
    </main>
  );
}
