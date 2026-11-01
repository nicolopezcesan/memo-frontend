import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card.js';
import { Input } from '../components/ui/input.js';
import { Label } from '../components/ui/label.js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.js';
import { useGameClient } from '../providers/game-client-provider.js';

const BOARD_SIZES = [
  { value: '16', label: '4x4 (16 cartas)' },
  { value: '24', label: '4x6 (24 cartas)' },
  { value: '36', label: '6x6 (36 cartas)' },
];

export function Lobby() {
  const client = useGameClient();
  const navigate = useNavigate();

  const [createNickname, setCreateNickname] = useState('');
  const [boardSize, setBoardSize] = useState('16');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [joinNickname, setJoinNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleCreateRoom(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      await client.connect();
      const result = await client.createRoom({
        nickname: createNickname,
        boardSize: Number(boardSize),
      });
      if (result.ok) {
        void navigate(`/room/${result.roomCode}`);
      } else {
        setCreateError(result.message);
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinRoom(event: FormEvent) {
    event.preventDefault();
    setJoinError(null);
    setJoining(true);
    try {
      await client.connect();
      const result = await client.joinRoom({
        roomCode: roomCode.trim().toUpperCase(),
        nickname: joinNickname,
      });
      if (result.ok) {
        void navigate(`/room/${roomCode.trim().toUpperCase()}`);
      } else {
        setJoinError(result.message);
      }
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center gap-6 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crear sala</CardTitle>
          <CardDescription>Elegí tu nombre y el tamaño del tablero.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleCreateRoom(event)}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="create-nickname">Nickname</Label>
              <Input
                id="create-nickname"
                value={createNickname}
                onChange={(e) => setCreateNickname(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="board-size">Tamaño del tablero</Label>
              <Select
                value={boardSize}
                onValueChange={(value) => {
                  if (value) setBoardSize(value);
                }}
              >
                <SelectTrigger id="board-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOARD_SIZES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError && <p className="text-sm text-destructive">{createError}</p>}
            <Button type="submit" disabled={creating}>
              {creating ? 'Creando…' : 'Crear sala'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Unirse a una sala</CardTitle>
          <CardDescription>Pedile el código de sala a quien te invitó.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => void handleJoinRoom(event)}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="join-nickname">Nickname</Label>
              <Input
                id="join-nickname"
                value={joinNickname}
                onChange={(e) => setJoinNickname(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="room-code">Código de sala</Label>
              <Input
                id="room-code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                required
              />
            </div>
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            <Button type="submit" disabled={joining}>
              {joining ? 'Uniéndose…' : 'Unirse'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
