import { aborted, agreeDraw, resign } from '@chess3d/chess-core';
import { describe, expect, it } from 'vitest';
import { outcomeTitle } from './labels';

describe('outcomeTitle', () => {
  it('speaks from the player’s point of view', () => {
    expect(outcomeTitle(resign('black'), 'white')).toBe('Bạn thắng!');
    expect(outcomeTitle(resign('white'), 'white')).toBe('Bạn thua');
  });

  it('names the winner in local games and handles draws and aborts', () => {
    expect(outcomeTitle(resign('white'), null)).toBe('Đen thắng');
    expect(outcomeTitle(agreeDraw(), 'white')).toBe('Hòa');
    expect(outcomeTitle(aborted(), null)).toBe('Ván bị hủy');
  });
});
