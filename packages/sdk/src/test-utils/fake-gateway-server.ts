import { createServer, type Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Server, type Socket } from 'socket.io';

/**
 * Minimal fake server replicating memo-backend's event contract shape
 * (ack format, event names, error codes) - not its actual game rules,
 * which are already covered by memo-backend's own test suite. This is
 * only here to exercise the SDK's transport/session plumbing in
 * isolation, without depending on the backend repo being checked out.
 */
export interface FakeGatewayServer {
  url: string;
  close(): Promise<void>;
}

interface FakeRoom {
  code: string;
  status: 'waiting' | 'playing';
  players: { playerId: string; nickname: string }[];
}

export async function startFakeGatewayServer(): Promise<FakeGatewayServer> {
  const httpServer: HttpServer = createServer();
  const io = new Server(httpServer, { cors: { origin: '*' } });

  const rooms = new Map<string, FakeRoom>();
  const sessions = new Map<string, { roomCode: string; playerId: string }>();

  io.on('connection', (socket: Socket) => {
    const sessionToken = socket.handshake.auth.sessionToken as string | undefined;
    if (sessionToken) {
      const session = sessions.get(sessionToken);
      if (!session) {
        socket.emit('error', { code: 'SESSION_INVALID', message: 'bad token' });
      } else {
        socket.data.roomCode = session.roomCode;
        socket.data.playerId = session.playerId;
        void socket.join(session.roomCode);
        socket.emit('session:resumed', {
          playerId: session.playerId,
          state: { code: session.roomCode, players: rooms.get(session.roomCode)?.players ?? [] },
        });
      }
    }

    socket.on('room:create', (payload: { nickname: string; boardSize: number }, ack) => {
      const code = randomUUID().slice(0, 6).toUpperCase();
      const playerId = randomUUID();
      const sessionToken2 = `fake-token-${playerId}`;
      rooms.set(code, {
        code,
        status: 'waiting',
        players: [{ playerId, nickname: payload.nickname }],
      });
      sessions.set(sessionToken2, { roomCode: code, playerId });
      socket.data.roomCode = code;
      socket.data.playerId = playerId;
      void socket.join(code);
      ack({
        ok: true,
        roomCode: code,
        sessionToken: sessionToken2,
        playerId,
        state: rooms.get(code),
      });
    });

    socket.on(
      'room:join',
      (payload: { roomCode: string; nickname: string }, ack) => {
        const room = rooms.get(payload.roomCode);
        if (!room) {
          ack({ ok: false, code: 'ROOM_NOT_FOUND', message: 'no such room' });
          return;
        }
        if (room.players.length >= 2) {
          ack({ ok: false, code: 'ROOM_FULL', message: 'room full' });
          return;
        }
        const playerId = randomUUID();
        const sessionToken2 = `fake-token-${playerId}`;
        room.players.push({ playerId, nickname: payload.nickname });
        sessions.set(sessionToken2, { roomCode: payload.roomCode, playerId });
        socket.data.roomCode = payload.roomCode;
        socket.data.playerId = playerId;
        void socket.join(payload.roomCode);
        io.to(payload.roomCode).emit('room:playerJoined', {
          playerId,
          nickname: payload.nickname,
          players: room.players,
        });
        ack({
          ok: true,
          sessionToken: sessionToken2,
          playerId,
          state: { code: room.code, status: room.status, players: room.players },
        });
      },
    );

    socket.on('room:start', (_payload: unknown, ack) => {
      const roomCode = socket.data.roomCode as string | undefined;
      const room = roomCode ? rooms.get(roomCode) : undefined;
      if (!room) {
        ack({ ok: false, code: 'VALIDATION_ERROR', message: 'no active room' });
        return;
      }
      room.status = 'playing';
      io.to(roomCode!).emit('game:started', { state: { code: room.code, status: 'playing' } });
      ack({ ok: true });
    });

    socket.on('card:flip', (payload: { cardIndex: number }, ack) => {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) {
        ack({ ok: false, code: 'VALIDATION_ERROR', message: 'no active room' });
        return;
      }
      io.to(roomCode).emit('card:flipped', {
        cardIndex: payload.cardIndex,
        symbol: 'A',
        byPlayerId: socket.data.playerId,
      });
      ack({ ok: true });
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  return {
    url: `http://localhost:${port}`,
    close: () =>
      new Promise<void>((resolve) => {
        void io.close(() => resolve());
      }),
  };
}
