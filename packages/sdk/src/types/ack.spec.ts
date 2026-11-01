import { describe, expect, it } from 'vitest';
import type { Ack } from './ack.js';

describe('Ack<T>', () => {
  it('narrows to the success shape when ok is true', () => {
    const ack: Ack<{ roomCode: string }> = { ok: true, roomCode: 'ABC123' };

    if (ack.ok) {
      expect(ack.roomCode).toBe('ABC123');
    } else {
      throw new Error('expected ok:true branch');
    }
  });

  it('narrows to the error shape when ok is false', () => {
    const ack: Ack<{ roomCode: string }> = {
      ok: false,
      code: 'ROOM_NOT_FOUND',
      message: 'nope',
    };

    if (!ack.ok) {
      expect(ack.code).toBe('ROOM_NOT_FOUND');
    } else {
      throw new Error('expected ok:false branch');
    }
  });
});
