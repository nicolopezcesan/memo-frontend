import { expect, test, type Page } from '@playwright/test';
import { Redis } from 'ioredis';

interface BackendCard {
  symbol: string;
  matched: boolean;
}

interface BackendRoomState {
  code: string;
  boardSize: number;
  deck: BackendCard[];
}

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

/**
 * Peeks at the real deck directly in Redis - memo-backend hides symbols
 * from the client (anti-cheat), so there is no way to discover the real
 * pairing from the browser alone. Mirrors the pattern memo-backend's own
 * e2e tests use to script a deterministic win.
 */
async function readRoomState(roomCode: string): Promise<BackendRoomState> {
  const raw = await redis.get(`room:${roomCode}`);
  if (!raw) throw new Error(`Room ${roomCode} not found in Redis`);
  return JSON.parse(raw) as BackendRoomState;
}

function pairUpIndices(deck: BackendCard[]): [number, number][] {
  const bySymbol = new Map<string, number[]>();
  deck.forEach((card, index) => {
    bySymbol.set(card.symbol, [...(bySymbol.get(card.symbol) ?? []), index]);
  });
  return [...bySymbol.values()] as [number, number][];
}

async function createRoom(page: Page, nickname: string): Promise<string> {
  await page.goto('/');
  await page.getByLabel('Nickname').nth(0).fill(nickname);
  await page.getByRole('button', { name: 'Crear sala' }).click();
  await page.waitForURL(/\/room\/[A-Z0-9]{6}$/);
  return page.url().split('/room/')[1];
}

async function joinRoom(page: Page, roomCode: string, nickname: string): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Nickname').nth(1).fill(nickname);
  await page.getByLabel('Código de sala').fill(roomCode);
  await page.getByRole('button', { name: 'Unirse' }).click();
  await page.waitForURL(`/room/${roomCode}`);
}

test('two players play a full game (default 4x4 board) end to end and see a winner', async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  const roomCode = await createRoom(host, 'Alice');
  await joinRoom(guest, roomCode, 'Bob');

  await expect(guest.getByText('Listos para empezar.')).toBeVisible();
  await host.getByRole('button', { name: 'Empezar partida' }).click();

  await expect(host.getByTestId('card-0')).toBeVisible();
  await expect(guest.getByTestId('card-0')).toBeVisible();

  const room = await readRoomState(roomCode);
  const pairs = pairUpIndices(room.deck);

  // The host matches every pair, so the turn never passes and the host
  // ends up with all the points - a deterministic winner.
  for (const [a, b] of pairs) {
    await host.getByTestId(`card-${a}`).click();
    await host.getByTestId(`card-${b}`).click();
    // Give the turn:result broadcast a moment to land on both pages.
    await host.waitForTimeout(200);
  }

  await expect(host.getByText('¡Ganaste!')).toBeVisible();
  await expect(guest.getByText('Perdiste')).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test.afterAll(async () => {
  redis.disconnect();
});
