import { BrowserRouter, Route, Routes } from 'react-router';
import { GameClientProvider } from './providers/game-client-provider.js';
import { Lobby } from './routes/lobby.js';
import { Room } from './routes/room.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

export function App() {
  return (
    <GameClientProvider url={BACKEND_URL}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </GameClientProvider>
  );
}
