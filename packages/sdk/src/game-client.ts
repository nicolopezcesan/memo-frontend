import { io, type Socket } from 'socket.io-client';
import type { SessionStorage, StoredSession } from './session-storage.js';
import type {
  Ack,
  BroadcastEventMap,
  CardFlipPayload,
  CardFlipResult,
  RoomCreatePayload,
  RoomCreateResult,
  RoomJoinPayload,
  RoomJoinResult,
  RoomStartResult,
} from './types/index.js';

export interface GameClientOptions {
  url: string;
  storage: SessionStorage;
}

type BroadcastHandler<E extends keyof BroadcastEventMap> = (
  payload: BroadcastEventMap[E],
) => void;

/**
 * Thin wrapper over socket.io-client: connection, session persistence,
 * reconnection, and the game actions (createRoom/joinRoom/startGame/
 * flipCard), each mapping 1:1 to an ack-based event on memo-backend.
 */
export class GameClient {
  private socket: Socket | null = null;

  /**
   * Mirrors what's in SessionStorage while connected: set from storage on
   * connect(), confirmed by session:resumed on a successful reconnect, and
   * cleared on a SESSION_INVALID error. createRoom/joinRoom (epic 4) set it
   * too, since that's when a session first comes into existence.
   */
  protected currentSession: StoredSession | null = null;

  constructor(protected readonly options: GameClientOptions) {}

  get session(): StoredSession | null {
    return this.currentSession;
  }

  async connect(): Promise<void> {
    const stored = await this.options.storage.get();
    this.currentSession = stored;

    const socket = io(this.options.url, {
      transports: ['websocket'],
      auth: stored ? { sessionToken: stored.sessionToken } : undefined,
    });
    this.socket = socket;

    socket.on('session:resumed', (payload: BroadcastEventMap['session:resumed']) => {
      // The sessionToken itself never changes (see memo-backend ADR 0002:
      // no exp, Redis TTL is the source of vigency), only confirm it's live.
      if (this.currentSession) {
        this.currentSession = { ...this.currentSession, playerId: payload.playerId };
      }
    });

    socket.on('error', (payload: BroadcastEventMap['error']) => {
      if (payload.code === 'SESSION_INVALID') {
        this.currentSession = null;
        void this.options.storage.clear();
      }
    });

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', (error: Error) => reject(error));
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  on<E extends keyof BroadcastEventMap>(event: E, handler: BroadcastHandler<E>): void {
    this.requireSocket().on(event as string, handler as (...args: unknown[]) => void);
  }

  off<E extends keyof BroadcastEventMap>(event: E, handler: BroadcastHandler<E>): void {
    this.requireSocket().off(event as string, handler as (...args: unknown[]) => void);
  }

  protected requireSocket(): Socket {
    if (!this.socket) {
      throw new Error('GameClient is not connected. Call connect() first.');
    }
    return this.socket;
  }

  async createRoom(payload: RoomCreatePayload): Promise<Ack<RoomCreateResult>> {
    const result = await this.requireSocket().emitWithAck('room:create', payload);
    if (result.ok) {
      await this.persistSession({
        sessionToken: result.sessionToken,
        roomCode: result.roomCode,
        playerId: result.playerId,
      });
    }
    return result as Ack<RoomCreateResult>;
  }

  async joinRoom(payload: RoomJoinPayload): Promise<Ack<RoomJoinResult>> {
    const result = await this.requireSocket().emitWithAck('room:join', payload);
    if (result.ok) {
      await this.persistSession({
        sessionToken: result.sessionToken,
        roomCode: payload.roomCode,
        playerId: result.playerId,
      });
    }
    return result as Ack<RoomJoinResult>;
  }

  async startGame(): Promise<Ack<RoomStartResult>> {
    return this.requireSocket().emitWithAck('room:start', {});
  }

  async flipCard(payload: CardFlipPayload): Promise<Ack<CardFlipResult>> {
    return this.requireSocket().emitWithAck('card:flip', payload);
  }

  private async persistSession(session: StoredSession): Promise<void> {
    this.currentSession = session;
    await this.options.storage.set(session);
  }
}
