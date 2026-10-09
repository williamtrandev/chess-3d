import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { growCherryTree, hangingPoints } from './trees';

describe('growCherryTree', () => {
  it('is deterministic for a seed', () => {
    const a = growCherryTree(3);
    const b = growCherryTree(3);
    expect(a.blossoms.length).toBe(b.blossoms.length);
    expect(a.segments[5]?.to.toArray()).toEqual(b.segments[5]?.to.toArray());
  });

  it('grows a branching tree with a full crown', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const tree = growCherryTree(seed);
      expect(tree.segments.length).toBeGreaterThan(30);
      expect(tree.blossoms.length).toBeGreaterThan(120);
      expect(tree.segments.every((s) => s.to.y > 0 && s.radiusTo > 0)).toBe(true);
    }
  });

  it('spreads wider than it is tall, like a cherry crown', () => {
    const { blossoms } = growCherryTree(7);
    const xs = blossoms.map((b) => b.position.x);
    const zs = blossoms.map((b) => b.position.z);
    const ys = blossoms.map((b) => b.position.y);
    const width = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
    expect(width).toBeGreaterThan(Math.max(...ys) - Math.min(...ys));
    expect(Math.min(...ys)).toBeGreaterThan(2);
  });
});

describe('hangingPoints', () => {
  it('starts and ends at the posts and sags in the middle', () => {
    const points = hangingPoints(new Vector3(0, 10, 0), new Vector3(10, 10, 0), 2, 5);
    expect(points[0]?.toArray()).toEqual([0, 10, 0]);
    expect(points[4]?.toArray()).toEqual([10, 10, 0]);
    expect(points[2]?.y).toBeCloseTo(8);
  });
});
