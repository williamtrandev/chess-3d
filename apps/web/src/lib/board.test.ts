import { STARTING_FEN } from '@chess3d/chess-core';
import { describe, expect, it } from 'vitest';
import { SQUARES, isLightSquare, kingSquare, pieceAt, piecesFromFen, squareCoords } from './board';

describe('board helpers', () => {
  it('lists squares from a8 to h1', () => {
    expect(SQUARES).toHaveLength(64);
    expect(SQUARES[0]).toBe('a8');
    expect(SQUARES[63]).toBe('h1');
  });

  it('maps squares to coordinates and colors', () => {
    expect(squareCoords('a1')).toEqual({ file: 0, rank: 0 });
    expect(squareCoords('h8')).toEqual({ file: 7, rank: 7 });
    expect(isLightSquare('a1')).toBe(false);
    expect(isLightSquare('h1')).toBe(true);
  });

  it('reads pieces from a FEN', () => {
    const pieces = piecesFromFen(STARTING_FEN);
    expect(pieces).toHaveLength(32);
    expect(pieceAt(pieces, 'e1')).toEqual({ square: 'e1', color: 'white', type: 'k' });
    expect(pieceAt(pieces, 'd8')).toEqual({ square: 'd8', color: 'black', type: 'q' });
    expect(pieceAt(pieces, 'e4')).toBeUndefined();
    expect(kingSquare(pieces, 'black')).toBe('e8');
  });
});
