import { describe, expect, it } from 'vitest';
import { abandon, aborted, agreeDraw, isRatable, resign, winResult } from './outcome.js';

describe('outcome', () => {
  it('maps winners to PGN results', () => {
    expect(winResult('white')).toBe('1-0');
    expect(winResult('black')).toBe('0-1');
  });

  it('gives the win to the opponent of the side that resigns or abandons', () => {
    expect(resign('black')).toEqual({ result: '1-0', winner: 'white', reason: 'resignation' });
    expect(abandon('white')).toEqual({ result: '0-1', winner: 'black', reason: 'abandonment' });
  });

  it('records draw agreement', () => {
    expect(agreeDraw()).toEqual({ result: '1/2-1/2', winner: null, reason: 'draw_agreement' });
  });

  it('never rates an aborted game', () => {
    expect(aborted()).toEqual({ result: null, winner: null, reason: 'aborted' });
    expect(isRatable(aborted())).toBe(false);
    expect(isRatable(agreeDraw())).toBe(true);
  });
});
