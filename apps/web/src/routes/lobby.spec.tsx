import type { GameClient } from '@memo/sdk';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GameClientContext } from '../providers/game-client-provider.js';
import { Lobby } from './lobby.js';
import { Room } from './room.js';

function createMockClient(overrides: Partial<GameClient>): Partial<GameClient> {
  return { on: vi.fn(), off: vi.fn(), ...overrides };
}

function renderLobby(client: Partial<GameClient>) {
  return render(
    <GameClientContext.Provider value={client as GameClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </MemoryRouter>
    </GameClientContext.Provider>,
  );
}

describe('Lobby', () => {
  it('creates a room and navigates to /room/:code on success', async () => {
    const client: Partial<GameClient> = createMockClient({
      connect: vi.fn().mockResolvedValue(undefined),
      createRoom: vi.fn().mockResolvedValue({
        ok: true,
        roomCode: 'ABC123',
        sessionToken: 'token',
        playerId: 'p1',
        state: {
          code: 'ABC123',
          status: 'waiting',
          boardSize: 16,
          deck: [],
          flippedIndices: [],
          currentTurnPlayerId: 'p1',
          players: [{ playerId: 'p1', nickname: 'Alice', score: 0, connected: true }],
          createdAt: Date.now(),
        },
      }),
    });
    renderLobby(client);

    const nicknameInput = document.getElementById('create-nickname')!;
    fireEvent.change(nicknameInput, { target: { value: 'Alice' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }));

    await waitFor(() =>
      expect(screen.getByText('Esperando al otro jugador…')).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'ABC123' })).toBeInTheDocument();
    expect(client.createRoom).toHaveBeenCalledWith({ nickname: 'Alice', boardSize: 16 });
  });

  it('shows the server error when joining fails', async () => {
    const client: Partial<GameClient> = createMockClient({
      connect: vi.fn().mockResolvedValue(undefined),
      joinRoom: vi.fn().mockResolvedValue({
        ok: false,
        code: 'ROOM_NOT_FOUND',
        message: 'No room found for code ZZZZZZ',
      }),
    });
    renderLobby(client);

    const nicknameInput = document.getElementById('join-nickname')!;
    fireEvent.change(nicknameInput, { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText('Código de sala'), {
      target: { value: 'ZZZZZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Unirse' }));

    await waitFor(() =>
      expect(screen.getByText('No room found for code ZZZZZZ')).toBeInTheDocument(),
    );
  });
});
