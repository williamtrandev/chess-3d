import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { PieceType } from './board';
import {
  APPROACH,
  ATTACK_TIME,
  ATTACK_WALL_TIME,
  IMPACT,
  SLASH,
  STRIKE,
  attackDirection,
  attackPose,
  effectSpeed,
  slashNormal,
} from './capture-fx';

const TYPES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];
const from = new Vector3(0, 0, 3);
const to = new Vector3(2, 0, -1);

describe('attackPose', () => {
  it.each(TYPES)('starts on the origin square and ends on the target, upright (%s)', (type) => {
    const start = attackPose(type, 0, from, to);
    expect(start.position.distanceTo(from)).toBeCloseTo(0);
    const end = attackPose(type, ATTACK_TIME, from, to);
    expect(end.position.distanceTo(to)).toBeCloseTo(0);
    expect(end.pitch).toBeCloseTo(0);
  });

  it.each(TYPES)('reaches the target square by the impact (%s)', (type) => {
    const pose = attackPose(type, IMPACT, from, to);
    const flat = pose.position.clone().setY(0);
    expect(flat.distanceTo(to)).toBeLessThan(0.3);
  });

  it.each(TYPES)('never dips below the board (%s)', (type) => {
    for (let t = 0; t <= ATTACK_TIME; t += 0.02) {
      expect(attackPose(type, t, from, to).position.y).toBeGreaterThanOrEqual(0);
    }
  });

  it('does not overshoot backwards on a one-square capture', () => {
    const near = new Vector3(0, 0, 2);
    const pose = attackPose('p', APPROACH, from, near);
    expect(pose.position.z).toBeLessThanOrEqual(from.z + 1e-9);
  });
});

describe('effect timing', () => {
  it('slows down only around the impact', () => {
    expect(effectSpeed(0)).toBe(1);
    expect(effectSpeed(IMPACT)).toBeLessThan(1);
    expect(effectSpeed(APPROACH + STRIKE + 0.3)).toBe(1);
  });

  it('takes longer on the wall clock than in effect time', () => {
    expect(ATTACK_WALL_TIME).toBeGreaterThan(ATTACK_TIME);
  });
});

describe('slashNormal', () => {
  it('returns a unit normal oriented by the attack direction', () => {
    const dir = attackDirection(from, to);
    for (const type of TYPES) {
      const normal = slashNormal(SLASH[type], dir);
      expect(normal.length()).toBeCloseTo(1);
    }
    // The rook splits the piece with a vertical plane running along the attack.
    expect(slashNormal(SLASH.r, dir).dot(dir)).toBeCloseTo(0);
    expect(slashNormal(SLASH.r, dir).y).toBeCloseTo(0);
  });
});
