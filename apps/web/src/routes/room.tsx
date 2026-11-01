import { useParams } from 'react-router';

// Tablero de juego: construido en la épica 8.
export function Room() {
  const { code } = useParams<{ code: string }>();

  return (
    <main className="flex min-h-svh items-center justify-center">
      <p>Sala {code}</p>
    </main>
  );
}
