import { createLocalStorageSession, GameClient } from '@memo/sdk';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

const GameClientContext = createContext<GameClient | null>(null);

export interface GameClientProviderProps {
  url: string;
  children: ReactNode;
}

export function GameClientProvider({ url, children }: GameClientProviderProps) {
  const client = useMemo(
    () => new GameClient({ url, storage: createLocalStorageSession() }),
    [url],
  );

  return (
    <GameClientContext.Provider value={client}>{children}</GameClientContext.Provider>
  );
}

export function useGameClient(): GameClient {
  const client = useContext(GameClientContext);
  if (!client) {
    throw new Error('useGameClient must be used within a GameClientProvider');
  }
  return client;
}
