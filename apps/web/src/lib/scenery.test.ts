import { describe, expect, it } from 'vitest';
import {
  GROUND_Y,
  ISLAND_RADIUS,
  WATER_Y,
  beachHeight,
  fbm,
  fieldHeight,
  hash,
  noise2,
  seededRandom,
} from './scenery';

describe('scenery helpers', () => {
  it('produces deterministic values in [0, 1)', () => {
    expect(hash(42)).toBe(hash(42));
    const random = seededRandom(7);
    const values = Array.from({ length: 200 }, random);
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(190);
  });

  it('keeps noise within range and continuous', () => {
    for (let i = 0; i < 100; i++) {
      const v = fbm(i * 0.37, i * 0.21);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(noise2(3.5, 2.5) - noise2(3.5001, 2.5))).toBeLessThan(0.01);
  });

  it('leaves the meadow flat under the table', () => {
    expect(fieldHeight(0, 0)).toBeCloseTo(GROUND_Y);
    expect(fieldHeight(4, -4)).toBeCloseTo(GROUND_Y);
  });

  it('keeps the island centre dry and the open sea under water', () => {
    expect(beachHeight(0, 0)).toBeCloseTo(GROUND_Y);
    expect(beachHeight(10, 0)).toBeGreaterThan(WATER_Y);
    expect(beachHeight(ISLAND_RADIUS + 30, 0)).toBeLessThan(WATER_Y);
  });
});
