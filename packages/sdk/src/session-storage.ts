export interface StoredSession {
  sessionToken: string;
  roomCode: string;
  playerId: string;
}

/**
 * Abstracts where the SDK persists a session, so GameClient never touches
 * localStorage (or any browser-only API) directly - a future React Native
 * client injects an adapter over AsyncStorage instead.
 */
export interface SessionStorage {
  get(): Promise<StoredSession | null>;
  set(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'memo:session';

/** Default SessionStorage for browser environments, backed by localStorage. */
export function createLocalStorageSession(): SessionStorage {
  return {
    async get() {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    },
    async set(session) {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
    },
    async clear() {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    },
  };
}
