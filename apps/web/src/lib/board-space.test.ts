import { describe, expect, it } from 'vitest';
import { SQUARES } from './board';
import { squareToVector, vectorToSquare } from './board-space';

describe('board space', () => {
  it('maps every square to a point and back', () => {
    for (const square of SQUARES) expect(vectorToSquare(squareToVector(square))).toBe(square);
  });

  it('puts white at +Z and rejects points off the board', () => {
    expect(squareToVector('e1').z).toBeGreaterThan(0);
    expect(squareToVector('e8').z).toBeLessThan(0);
    expect(vectorToSquare(squareToVector('a1').add({ x: -1, y: 0, z: 0 } as never))).toBeNull();
  });
});
