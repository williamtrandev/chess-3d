import { Vector3 } from 'three';
import type { PieceType } from './board';

/**
 * Cinematic captures: the capturing piece charges in its own style, strikes, and the
 * captured piece is cut in two along a plane that depends on the attacker.
 *
 * Times are in seconds of "effect time", which runs slower around the impact.
 */
export const APPROACH = 0.62;
export const STRIKE = 0.2;
export const SETTLE = 0.38;
export const ATTACK_TIME = APPROACH + STRIKE + SETTLE;
/** When the blow lands, within the strike. */
export const IMPACT = APPROACH + STRIKE * 0.7;
/** How long the halves of the captured piece stay after the impact (falling, then fading). */
export const DEBRIS_TIME = 2.3;
export const FADE_START = 1.2;

const SLOW_FROM = IMPACT - 0.05;
const SLOW_TO = IMPACT + 0.22;
const SLOW_SPEED = 0.3;

/** Effect-time speed: a short slow motion around the impact. */
export const effectSpeed = (time: number): number =>
  time >= SLOW_FROM && time < SLOW_TO ? SLOW_SPEED : 1;

/** Wall-clock seconds the attack takes, slow motion included. */
export const ATTACK_WALL_TIME = ATTACK_TIME + (SLOW_TO - SLOW_FROM) * (1 / SLOW_SPEED - 1);

export interface SlashStyle {
  /** Cut plane normal in the target's frame: x = side, y = up, z = along the attack. */
  normal: [number, number, number];
  /** Height of the cut as a fraction of the captured piece's height. */
  height: number;
  /** Board shake on impact, 0 for none. */
  shake: number;
}

export const SLASH: Record<PieceType, SlashStyle> = {
  // Knight: a rising diagonal sabre cut.
  n: { normal: [0.7, 0.7, 0], height: 0.5, shake: 0 },
  // Pawn: a low diagonal thrust.
  p: { normal: [-0.6, 0.8, 0.1], height: 0.38, shake: 0 },
  // Bishop: a spinning horizontal cut that sends the top flying.
  b: { normal: [0, 1, 0.15], height: 0.55, shake: 0 },
  // Rook: rams straight through, splitting the piece down the middle.
  r: { normal: [1, 0, 0], height: 0.5, shake: 0.18 },
  // Queen: a high horizontal sweep.
  q: { normal: [0.15, 1, 0], height: 0.66, shake: 0 },
  // King: an overhead blow that cleaves the piece.
  k: { normal: [1, 0.12, 0], height: 0.5, shake: 0.3 },
};

export interface AttackPose {
  position: Vector3;
  /** Lean forward (positive) or rear back (negative) around the axis across the path. */
  pitch: number;
  /** Extra turn around the vertical axis. */
  spin: number;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeIn = (t: number) => t * t * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Where the attacking piece is `time` seconds into its attack from `from` to `to`: it
 * approaches to just short of the target, strikes through it, then settles on the square.
 */
export const attackPose = (
  type: PieceType,
  time: number,
  from: Vector3,
  to: Vector3,
): AttackPose => {
  const path = to.clone().sub(from).setY(0);
  const length = Math.max(path.length(), 1e-6);
  const dir = path.clone().divideScalar(length);
  // Stop short of the target, but never behind the start.
  const stop = from.clone().addScaledVector(dir, Math.max(0, length - 0.55));
  const through = to.clone().addScaledVector(dir, 0.08);

  const a = clamp01(time / APPROACH);
  const s = clamp01((time - APPROACH) / STRIKE);
  const e = clamp01((time - APPROACH - STRIKE) / SETTLE);

  const position = new Vector3();
  let pitch = 0;
  let spin = 0;
  let y = 0;

  if (time < APPROACH) {
    const k = type === 'r' ? easeIn(a) : ease(a);
    position.lerpVectors(from, stop, k);
    switch (type) {
      case 'n': // gallop: three bounds, rocking like a horse
        y = Math.abs(Math.sin(a * Math.PI * 3)) * 0.38;
        pitch = Math.sin(a * Math.PI * 6) * 0.22 - a * 0.35;
        break;
      case 'p': // two short hops
        y = Math.abs(Math.sin(a * Math.PI * 2)) * 0.22;
        break;
      case 'b': // glide while spinning up
        y = Math.sin(a * Math.PI) * 0.25;
        spin = a * a * Math.PI * 4;
        break;
      case 'r': // low charge, leaning in
        pitch = a * 0.25;
        break;
      case 'q': // rise and circle
        y = Math.sin(a * Math.PI * 0.5) * 1.1;
        spin = a * Math.PI * 2;
        break;
      case 'k': // leap high
        y = Math.sin(a * Math.PI * 0.5) * 1.5;
        pitch = -a * 0.3;
        break;
    }
  } else if (time < APPROACH + STRIKE) {
    position.lerpVectors(stop, through, ease(s));
    switch (type) {
      case 'n':
        y = 0.38 * (1 - s);
        pitch = -0.6 + s * 1.1; // rear up, then crash down
        break;
      case 'p':
        pitch = Math.sin(s * Math.PI) * 0.45;
        break;
      case 'b':
        y = 0.2 * (1 - s);
        spin = Math.PI * 4 + s * Math.PI * 2;
        break;
      case 'r':
        pitch = 0.25 + Math.sin(s * Math.PI) * 0.2;
        break;
      case 'q':
        y = 1.1 * (1 - ease(s));
        spin = Math.PI * 2 + s * Math.PI;
        pitch = s * 0.4;
        break;
      case 'k':
        y = 1.5 * (1 - easeIn(s));
        pitch = -0.3 + s * 0.8;
        break;
    }
  } else {
    position.lerpVectors(through, to, ease(e));
    const settle = 1 - ease(e);
    pitch =
      settle *
      ({ n: 0.5, p: 0.45, b: 0, r: 0.25, q: 0.4, k: 0.5 } as Record<PieceType, number>)[type];
    spin = { b: Math.PI * 6, q: Math.PI * 3 }[type as 'b' | 'q'] ?? 0;
  }
  position.y = y;
  return { position, pitch, spin };
};

/** Horizontal unit vector from `from` to `to` (towards the opponent when they coincide). */
export const attackDirection = (from: Vector3, to: Vector3): Vector3 => {
  const dir = to.clone().sub(from).setY(0);
  return dir.lengthSq() > 1e-9 ? dir.normalize() : new Vector3(0, 0, -1);
};

/** The cut plane normal in world space for an attack along `dir`. */
export const slashNormal = (style: SlashStyle, dir: Vector3): Vector3 => {
  const up = new Vector3(0, 1, 0);
  const side = new Vector3().crossVectors(dir, up).normalize();
  const [x, y, z] = style.normal;
  return side.multiplyScalar(x).addScaledVector(up, y).addScaledVector(dir, z).normalize();
};
