import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GameClient } from './game-client.js';
import type { SessionStorage, StoredSession } from './session-storage.js';
import { startFakeGatewayServer, type FakeGatewayServer } from './test-utils/fake-gateway-server.js';
import type { BroadcastEventMap } from './types/index.js';

function createMemoryStorage(initial: StoredSession | null = null): SessionStorage {
  let session = initial;
  return {
    async get() {
      return session;
    },
    async set(next) {
      session = next;
    },
    async clear() {
      session = null;
    },
  };
}

function waitForEvent<E extends keyof BroadcastEventMap>(
  client: GameClient,
  event: E,
): Promise<BroadcastEventMap[E]> {
  return new Promise((resolve) => {
    const handler = (payload: BroadcastEventMap[E]) => {
      client.off(event, handler);
      resolve(payload);
    };
    client.on(event, handler);
  });
}

describe('GameClient', () => {
  let server: FakeGatewayServer;
  const clients: GameClient[] = [];

  beforeAll(async () => {
    server = await startFakeGatewayServer();
  });

  afterEach(() => {
    for (const client of clients.splice(0)) {
      client.disconnect();
    }
  });

  afterAll(async () => {
    await server.close();
  });

  function newClient(storage?: SessionStorage): GameClient {
    const client = new GameClient({ url: server.url, storage: storage ?? createMemoryStorage() });
    clients.push(client);
    return client;
  }

  describe('connection', () => {
    it('connects without a stored session', async () => {
      const client = newClient();
      await client.connect();
      expect(client.connected).toBe(true);
      expect(client.session).toBeNull();
    });
  });

  describe('createRoom / joinRoom', () => {
    it('creates a room and persists the new session', async () => {
      const storage = createMemoryStorage();
      const client = newClient(storage);
      await client.connect();

      const result = await client.createRoom({ nickname: 'Alice', boardSize: 4 });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error('expected ok:true');
      expect(result.roomCode).toBeTypeOf('string');
      expect(client.session).toEqual({
        sessionToken: result.sessionToken,
        roomCode: result.roomCode,
        playerId: result.playerId,
      });
      expect(await storage.get()).toEqual(client.session);
    });

    it('joins a room and the creator receives room:playerJoined', async () => {
      const host = newClient();
      await host.connect();
      const created = await host.createRoom({ nickname: 'Alice', boardSize: 4 });
      if (!created.ok) throw new Error('expected ok:true');

      const guest = newClient();
      await guest.connect();

      const playerJoined = waitForEvent(host, 'room:playerJoined');
      const joined = await guest.joinRoom({ roomCode: created.roomCode, nickname: 'Bob' });

      expect(joined.ok).toBe(true);
      const event = await playerJoined;
      expect(event.nickname).toBe('Bob');
    });

    it('returns ROOM_NOT_FOUND for a bogus code', async () => {
      const client = newClient();
      await client.connect();

      const result = await client.joinRoom({ roomCode: 'ZZZZZZ', nickname: 'Eve' });

      expect(result).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' });
    });
  });

  describe('startGame / flipCard', () => {
    it('starts the game and broadcasts game:started', async () => {
      const client = newClient();
      await client.connect();
      await client.createRoom({ nickname: 'Alice', boardSize: 4 });

      const gameStarted = waitForEvent(client, 'game:started');
      const result = await client.startGame();

      expect(result.ok).toBe(true);
      await expect(gameStarted).resolves.toBeDefined();
    });

    it('flips a card and broadcasts card:flipped', async () => {
      const client = newClient();
      await client.connect();
      await client.createRoom({ nickname: 'Alice', boardSize: 4 });
      await client.startGame();

      const cardFlipped = waitForEvent(client, 'card:flipped');
      const result = await client.flipCard({ cardIndex: 0 });

      expect(result.ok).toBe(true);
      const event = await cardFlipped;
      expect(event.cardIndex).toBe(0);
    });
  });

  describe('reconnection', () => {
    it('resumes a session and receives session:resumed', async () => {
      const host = newClient();
      await host.connect();
      const created = await host.createRoom({ nickname: 'Alice', boardSize: 4 });
      if (!created.ok) throw new Error('expected ok:true');
      host.disconnect();

      const storage = createMemoryStorage({
        sessionToken: created.sessionToken,
        roomCode: created.roomCode,
        playerId: created.playerId,
      });
      const reconnecting = newClient(storage);

      const resumed = waitForEvent(reconnecting, 'session:resumed');
      await reconnecting.connect();

      const event = await resumed;
      expect(event.playerId).toBe(created.playerId);
      expect(reconnecting.session?.playerId).toBe(created.playerId);
    });

    it('clears the session on SESSION_INVALID', async () => {
      const storage = createMemoryStorage({
        sessionToken: 'not-a-real-token',
        roomCode: 'ZZZZZZ',
        playerId: 'ghost',
      });
      const client = newClient(storage);

      const errorEvent = waitForEvent(client, 'error');
      await client.connect();

      const event = await errorEvent;
      expect(event.code).toBe('SESSION_INVALID');
      expect(client.session).toBeNull();
      expect(await storage.get()).toBeNull();
    });
  });
});
