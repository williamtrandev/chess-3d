import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { PieceType } from '@/lib/board';
import { figureFor, figureRestYaw, figureYawTowards } from './figures';

const TYPES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];

describe('figures', () => {
  it.each(TYPES)('builds a coloured figure that fits its square (%s)', (type) => {
    for (const side of ['white', 'black'] as const) {
      const figure = figureFor(type, side);
      expect(figure.whole.getAttribute('color')).toBeDefined();
      const box = new Box3().setFromBufferAttribute(figure.whole.getAttribute('position') as never);
      expect(box.min.y).toBeGreaterThanOrEqual(-0.01);
      expect(box.max.y).toBeGreaterThan(0.6);
      expect(box.max.y).toBeLessThan(1.4);
      // Within one board square (1 unit), so neighbours never overlap.
      expect(box.max.x - box.min.x).toBeLessThan(1);
      expect(box.max.z - box.min.z).toBeLessThan(1);
    }
  });

  it('shares one figure per type and side', () => {
    expect(figureFor('n', 'white')).toBe(figureFor('n', 'white'));
    expect(figureFor('n', 'white')).not.toBe(figureFor('n', 'black'));
  });

  it('faces the opponent at rest and the target when charging', () => {
    expect(figureRestYaw('white')).toBe(0);
    expect(figureRestYaw('black')).toBeCloseTo(Math.PI);
    // A figure built facing -Z, turned by this yaw, should face the direction given.
    const dir = new Vector3(1, 0, -1).normalize();
    const facing = new Vector3(0, 0, -1).applyAxisAngle(
      new Vector3(0, 1, 0),
      figureYawTowards(dir),
    );
    expect(facing.distanceTo(dir)).toBeCloseTo(0);
  });
});
