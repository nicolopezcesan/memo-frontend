import type { GameClient } from '@memo/sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { GameClientContext } from '../providers/game-client-provider.js';
import { Lobby } from '../routes/lobby.js';
import { Room } from '../routes/room.js';
import { AutoResume } from './auto-resume.js';

function renderApp(client: Partial<GameClient>) {
  return render(
    <GameClientContext.Provider value={client as GameClient}>
      <MemoryRouter initialEntries={['/']}>
        <AutoResume />
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </MemoryRouter>
    </GameClientContext.Provider>,
  );
}

describe('AutoResume', () => {
  it('connects on mount', () => {
    const connect = vi.fn().mockResolvedValue(undefined);
    const client: Partial<GameClient> = { connect, on: vi.fn(), off: vi.fn(), session: null };
    renderApp(client);

    expect(connect).toHaveBeenCalled();
  });

  it('redirects from the lobby to the room when a session already exists', async () => {
    const client: Partial<GameClient> = {
      connect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      session: { sessionToken: 't', roomCode: 'ABC123', playerId: 'p1' },
    };
    renderApp(client);

    await waitFor(() => expect(screen.getByText('Cargando sala ABC123…')).toBeInTheDocument());
  });

  it('stays on the lobby when there is no stored session', () => {
    const client: Partial<GameClient> = {
      connect: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      session: null,
    };
    renderApp(client);

    expect(
      screen.getByText('Elegí tu nombre y el tamaño del tablero.'),
    ).toBeInTheDocument();
  });
});
