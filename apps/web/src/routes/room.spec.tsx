import type { GameClient, RoomState } from '@memo/sdk';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GameClientContext } from '../providers/game-client-provider.js';
import { Room } from './room.js';

function createMockClient(playerId: string | null) {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  const client: Partial<GameClient> = {
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
    }),
    off: vi.fn((event: string, handler: (payload: unknown) => void) => {
      handlers.get(event)?.delete(handler);
    }),
    startGame: vi.fn().mockResolvedValue({ ok: true }),
    flipCard: vi.fn().mockResolvedValue({ ok: true }),
  };
  Object.defineProperty(client, 'session', {
    get: () => (playerId ? { sessionToken: 't', roomCode: 'ABC123', playerId } : null),
  });

  function emit(event: string, payload: unknown) {
    for (const handler of handlers.get(event) ?? []) handler(payload);
  }

  return { client: client as GameClient, emit };
}

function renderRoom(client: GameClient, initialState: RoomState) {
  return render(
    <GameClientContext.Provider value={client}>
      <MemoryRouter
        initialEntries={[{ pathname: '/room/ABC123', state: initialState }]}
      >
        <Routes>
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </MemoryRouter>
    </GameClientContext.Provider>,
  );
}

function baseState(overrides: Partial<RoomState> = {}): RoomState {
  return {
    code: 'ABC123',
    status: 'waiting',
    boardSize: 16,
    deck: Array.from({ length: 4 }, () => ({ symbol: null, matched: false })),
    flippedIndices: [],
    currentTurnPlayerId: 'host',
    players: [
      { playerId: 'host', nickname: 'Alice', score: 0, connected: true },
      { playerId: 'guest', nickname: 'Bob', score: 0, connected: true },
    ],
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('Room', () => {
  it('lets the host start the game once 2 players are present', async () => {
    const { client } = createMockClient('host');
    renderRoom(client, baseState());

    const startButton = screen.getByRole('button', { name: 'Empezar partida' });
    fireEvent.click(startButton);

    await waitFor(() => expect(client.startGame).toHaveBeenCalled());
  });

  it('does not show the start button for the non-host player', () => {
    const { client } = createMockClient('guest');
    renderRoom(client, baseState());

    expect(screen.queryByRole('button', { name: 'Empezar partida' })).not.toBeInTheDocument();
  });

  it('flips a card on click when it is my turn and the game is playing', async () => {
    const { client } = createMockClient('host');
    renderRoom(client, baseState({ status: 'playing' }));

    const cards = screen.getAllByRole('button');
    fireEvent.click(cards[0]);

    await waitFor(() => expect(client.flipCard).toHaveBeenCalledWith({ cardIndex: 0 }));
  });

  it('does not flip a card when it is not my turn', () => {
    const { client } = createMockClient('guest');
    renderRoom(client, baseState({ status: 'playing', currentTurnPlayerId: 'host' }));

    const cards = screen.getAllByRole('button');
    fireEvent.click(cards[0]);

    expect(client.flipCard).not.toHaveBeenCalled();
  });

  it('reveals a card symbol on card:flipped and shows the win screen on game:ended', async () => {
    const { client, emit } = createMockClient('host');
    renderRoom(client, baseState({ status: 'playing' }));

    emit('card:flipped', { cardIndex: 0, symbol: 'A', byPlayerId: 'host' });
    await waitFor(() => expect(screen.getAllByRole('button')[0]).toHaveTextContent('A'));

    emit('game:ended', { scores: { host: 2, guest: 0 }, winnerId: 'host' });
    await waitFor(() => expect(screen.getByText('¡Ganaste!')).toBeInTheDocument());
  });
});
