import {
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import type { Color as Side } from '@chess3d/chess-core';
import type { PieceType } from '@/lib/board';
import { bake, place, type Placed } from '@/lib/bake';
import { segmentRotation } from '@/lib/rig';

/**
 * The "Chiến binh" piece set: chibi soldiers instead of chess pieces. Each figure is built
 * facing -Z at unit size, then baked into two vertex-coloured meshes: the body, and the
 * arm holding the weapon (so it can swing when the piece strikes).
 */
export interface Figure {
  body: BufferGeometry;
  weapon: BufferGeometry;
  /** Body and weapon together, for the captured piece. */
  whole: BufferGeometry;
  /** Shoulder the weapon arm swings around. */
  pivot: Vector3;
}

interface Palette {
  armor: string;
  cloth: string;
  trim: string;
  skin: string;
  hair: string;
  beard: string;
  dark: string;
  metal: string;
  wood: string;
  horse: string;
  horseDark: string;
  mane: string;
}

const PALETTES: Record<Side, Palette> = {
  white: {
    armor: '#e3e8ef',
    cloth: '#2f6fdb',
    trim: '#e2b341',
    skin: '#f0c7a0',
    hair: '#6b4428',
    beard: '#ece6dc',
    dark: '#2a2a33',
    metal: '#cdd3dc',
    wood: '#9a6a3f',
    horse: '#f1ece2',
    horseDark: '#bfb3a2',
    mane: '#d8c8ad',
  },
  black: {
    armor: '#3b404c',
    cloth: '#b42424',
    trim: '#d9a338',
    skin: '#d7a37c',
    hair: '#1f1712',
    beard: '#6d6a66',
    dark: '#111115',
    metal: '#5d6573',
    wood: '#5b3a22',
    horse: '#2e2522',
    horseDark: '#17110f',
    mane: '#0e0a09',
  },
};

type V = [number, number, number];
type Slot = 'body' | 'weapon';

/** Collects coloured parts for one figure and bakes them. */
class FigureBuilder {
  readonly parts: Record<Slot, Placed[]> = { body: [], weapon: [] };
  private readonly temps: BufferGeometry[] = [];

  constructor(readonly palette: Palette) {}

  private add(slot: Slot, geometry: BufferGeometry, matrix: Placed['matrix'], color: string) {
    this.temps.push(geometry);
    this.parts[slot].push({ geometry, matrix, color: new Color(color) });
  }

  sphere(at: V, radius: number, color: string, scale: V = [1, 1, 1], slot: Slot = 'body') {
    this.add(
      slot,
      new SphereGeometry(1, 14, 10),
      place(at, undefined, scale.map((s) => s * radius) as V),
      color,
    );
  }

  /** Hemisphere cap (for helmets), open side down. */
  cap(at: V, radius: number, color: string, slot: Slot = 'body') {
    this.add(
      slot,
      new SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      place(at),
      color,
    );
  }

  capsule(from: V, to: V, radius: number, color: string, slot: Slot = 'body') {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    this.add(
      slot,
      new CapsuleGeometry(radius, Math.max(a.distanceTo(b), 1e-3), 4, 10),
      place(a.clone().add(b).multiplyScalar(0.5), segmentRotation(a, b)),
      color,
    );
  }

  cylinder(
    at: V,
    top: number,
    bottom: number,
    height: number,
    color: string,
    rotation?: Euler,
    slot: Slot = 'body',
  ) {
    this.add(slot, new CylinderGeometry(top, bottom, height, 16), place(at, rotation), color);
  }

  cone(
    at: V,
    radius: number,
    height: number,
    color: string,
    rotation?: Euler,
    slot: Slot = 'body',
  ) {
    this.add(slot, new ConeGeometry(radius, height, 12), place(at, rotation), color);
  }

  box(at: V, size: V, color: string, rotation?: Euler, slot: Slot = 'body') {
    this.add(slot, new BoxGeometry(...size), place(at, rotation), color);
  }

  torus(at: V, radius: number, tube: number, color: string, rotation?: Euler, slot: Slot = 'body') {
    this.add(slot, new TorusGeometry(radius, tube, 6, 24), place(at, rotation), color);
  }

  build(scale: number, pivot: V): Figure {
    const body = bake(this.parts.body);
    const weapon = bake(this.parts.weapon);
    const whole = bake([...this.parts.body, ...this.parts.weapon]);
    this.temps.forEach((g) => g.dispose());
    for (const g of [body, weapon, whole]) g.scale(scale, scale, scale);
    return { body, weapon, whole, pivot: new Vector3(...pivot).multiplyScalar(scale) };
  }
}

const FLAT = new Euler(Math.PI / 2, 0, 0);
const FACING = new Euler(Math.PI / 2, 0, 0);

/** Big chibi head with eyes, shared by every figure. */
const head = (b: FigureBuilder, y: number, radius = 0.14, z = 0) => {
  const p = b.palette;
  b.sphere([0, y, z], radius, p.skin);
  for (const side of [-1, 1]) {
    b.sphere([side * radius * 0.36, y - radius * 0.02, z - radius * 0.92], radius * 0.16, p.dark);
  }
};

/** Legs, boots and armoured torso of a standing soldier, up to the shoulders (y ≈ 0.38). */
const soldierBody = (b: FigureBuilder, width = 1) => {
  const p = b.palette;
  for (const side of [-1, 1]) {
    b.capsule([side * 0.06 * width, 0.06, 0], [side * 0.06 * width, 0.2, 0], 0.045, p.dark);
    b.sphere([side * 0.06 * width, 0.035, -0.02], 0.05, p.dark, [1, 0.7, 1.4]);
  }
  b.sphere([0, 0.31, 0], 1, p.armor, [0.13 * width, 0.14, 0.11]);
  b.box([0, 0.28, -0.1], [0.13 * width, 0.17, 0.02], p.cloth);
  b.torus([0, 0.24, 0], 0.118 * width, 0.018, p.trim, FLAT);
  for (const side of [-1, 1]) b.sphere([side * 0.125 * width, 0.38, 0], 0.052, p.metal);
};

/** The arm holding the weapon: shoulder at `shoulder`, hand at `hand`. */
const weaponArm = (b: FigureBuilder, shoulder: V, hand: V, sleeve: string) => {
  b.capsule(shoulder, hand, 0.035, sleeve, 'weapon');
  b.sphere(hand, 0.04, b.palette.skin, [1, 1, 1], 'weapon');
};

/** Free arm, holding something in front (shield, gown, robe). */
const freeArm = (b: FigureBuilder, shoulder: V, hand: V, sleeve: string) => {
  b.capsule(shoulder, hand, 0.035, sleeve);
  b.sphere(hand, 0.04, b.palette.skin);
};

const sword = (b: FigureBuilder, hand: V, length: number) => {
  const p = b.palette;
  const [x, y, z] = hand;
  b.box([x, y + 0.03, z], [0.02, 0.07, 0.02], p.wood, undefined, 'weapon');
  b.box([x, y + 0.075, z], [0.09, 0.016, 0.022], p.trim, undefined, 'weapon');
  b.box([x, y + 0.08 + length / 2, z], [0.03, length, 0.008], p.metal, undefined, 'weapon');
  b.cone([x, y + 0.09 + length, z], 0.021, 0.04, p.metal, undefined, 'weapon');
};

const pawn = (b: FigureBuilder): Figure => {
  const p = b.palette;
  soldierBody(b);
  head(b, 0.53);
  // Kettle helmet.
  b.cap([0, 0.56, 0], 0.15, p.metal);
  b.cylinder([0, 0.565, 0], 0.2, 0.2, 0.014, p.metal);
  // Round shield on the left arm.
  freeArm(b, [-0.13, 0.37, 0], [-0.16, 0.26, -0.07], p.armor);
  b.cylinder([-0.17, 0.28, -0.11], 0.12, 0.12, 0.025, p.cloth, FACING);
  b.torus([-0.17, 0.28, -0.125], 0.115, 0.012, p.trim);
  b.sphere([-0.17, 0.28, -0.13], 0.025, p.trim);
  // Spear.
  weaponArm(b, [0.13, 0.37, 0], [0.16, 0.27, -0.08], p.armor);
  b.cylinder([0.16, 0.42, -0.08], 0.012, 0.012, 0.72, p.wood, undefined, 'weapon');
  b.cone([0.16, 0.81, -0.08], 0.03, 0.08, p.metal, undefined, 'weapon');
  return b.build(1, [0.13, 0.37, 0]);
};

const knight = (b: FigureBuilder): Figure => {
  const p = b.palette;
  // Horse.
  b.capsule([0, 0.33, 0.13], [0, 0.33, -0.13], 0.12, p.horse);
  b.capsule([0, 0.38, -0.12], [0, 0.52, -0.22], 0.066, p.horse);
  b.capsule([0, 0.54, -0.22], [0, 0.47, -0.34], 0.056, p.horse);
  b.sphere([0, 0.455, -0.365], 0.045, p.horseDark);
  for (const side of [-1, 1]) {
    b.cone([side * 0.03, 0.6, -0.2], 0.016, 0.05, p.horse);
    b.sphere([side * 0.046, 0.53, -0.28], 0.013, p.dark);
  }
  b.capsule([0, 0.45, -0.11], [0, 0.6, -0.19], 0.03, p.mane);
  b.capsule([0, 0.36, 0.24], [0, 0.2, 0.31], 0.036, p.mane);
  for (const [x, z] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    b.capsule([x * 0.07, 0.29, z * 0.11], [x * 0.07, 0.05, z * 0.12], 0.033, p.horse);
    b.sphere([x * 0.07, 0.03, z * 0.12], 0.036, p.horseDark, [1, 0.7, 1]);
  }
  b.box([0, 0.44, 0.02], [0.27, 0.03, 0.21], p.cloth);
  b.box([0, 0.425, 0.02], [0.28, 0.012, 0.22], p.trim);
  // Rider.
  for (const side of [-1, 1])
    b.capsule([side * 0.09, 0.48, 0.02], [side * 0.12, 0.35, -0.04], 0.035, p.dark);
  b.sphere([0, 0.58, 0.02], 1, p.armor, [0.1, 0.11, 0.085]);
  b.box([0, 0.57, -0.06], [0.1, 0.12, 0.015], p.cloth);
  head(b, 0.75, 0.105, 0);
  b.cap([0, 0.765, 0], 0.115, p.metal);
  b.capsule([0, 0.87, 0], [0, 0.85, 0.12], 0.03, p.cloth);
  freeArm(b, [-0.09, 0.64, 0.02], [-0.12, 0.53, -0.05], p.armor);
  weaponArm(b, [0.09, 0.64, 0.02], [0.13, 0.6, -0.08], p.armor);
  sword(b, [0.13, 0.6, -0.08], 0.26);
  return b.build(1.12, [0.09, 0.64, 0.02]);
};

const bishop = (b: FigureBuilder): Figure => {
  const p = b.palette;
  // Robe with a trimmed hem and a stole down the front.
  b.cylinder([0, 0.21, 0], 0.085, 0.19, 0.42, p.cloth);
  b.torus([0, 0.02, 0], 0.185, 0.018, p.trim, FLAT);
  b.box([0, 0.22, -0.13], [0.05, 0.36, 0.015], p.trim, new Euler(-0.27, 0, 0));
  b.sphere([0, 0.42, 0], 1, p.cloth, [0.12, 0.06, 0.1]);
  head(b, 0.56);
  b.sphere([0, 0.47, -0.1], 1, p.beard, [0.07, 0.08, 0.04]);
  // Mitre with a cross.
  b.cylinder([0, 0.75, 0], 0.04, 0.11, 0.2, p.cloth);
  b.box([0, 0.76, -0.085], [0.016, 0.1, 0.01], p.trim, new Euler(-0.3, 0, 0));
  b.box([0, 0.78, -0.08], [0.06, 0.016, 0.01], p.trim, new Euler(-0.3, 0, 0));
  freeArm(b, [-0.12, 0.4, 0], [-0.13, 0.3, -0.09], p.cloth);
  // Staff topped with an orb.
  weaponArm(b, [0.12, 0.4, 0], [0.16, 0.3, -0.08], p.cloth);
  b.cylinder([0.16, 0.43, -0.08], 0.013, 0.013, 0.82, p.wood, undefined, 'weapon');
  b.sphere([0.16, 0.86, -0.08], 0.055, p.trim, [1, 1, 1], 'weapon');
  return b.build(1.12, [0.12, 0.4, 0]);
};

const rook = (b: FigureBuilder): Figure => {
  const p = b.palette;
  soldierBody(b, 1.25);
  head(b, 0.54, 0.13);
  // Great helm with a visor slit.
  b.sphere([0, 0.55, 0], 0.15, p.metal, [1, 1.05, 1]);
  b.box([0, 0.55, -0.145], [0.16, 0.022, 0.02], p.dark);
  b.cone([0, 0.71, 0], 0.03, 0.06, p.trim);
  // Tower shield.
  freeArm(b, [-0.16, 0.37, 0], [-0.17, 0.27, -0.1], p.armor);
  b.box([-0.12, 0.29, -0.17], [0.27, 0.36, 0.035], p.cloth);
  b.box([-0.12, 0.29, -0.19], [0.06, 0.32, 0.01], p.trim);
  b.box([-0.12, 0.3, -0.19], [0.23, 0.05, 0.01], p.trim);
  // War hammer.
  weaponArm(b, [0.16, 0.37, 0], [0.19, 0.27, -0.06], p.armor);
  b.cylinder([0.19, 0.42, -0.06], 0.015, 0.015, 0.42, p.wood, undefined, 'weapon');
  b.box([0.19, 0.64, -0.06], [0.08, 0.08, 0.17], p.metal, undefined, 'weapon');
  return b.build(1.28, [0.16, 0.37, 0]);
};

const queen = (b: FigureBuilder): Figure => {
  const p = b.palette;
  // Gown and bodice.
  b.cone([0, 0.19, 0], 0.23, 0.38, p.cloth);
  b.torus([0, 0.02, 0], 0.22, 0.018, p.trim, FLAT);
  b.sphere([0, 0.39, 0], 1, p.armor, [0.1, 0.1, 0.085]);
  b.torus([0, 0.33, 0], 0.085, 0.016, p.trim, FLAT);
  // Long hair behind the head.
  b.sphere([0, 0.56, 0.035], 0.152, p.hair);
  b.capsule([0, 0.52, 0.08], [0, 0.32, 0.1], 0.085, p.hair);
  head(b, 0.55);
  // Crown.
  b.torus([0, 0.68, 0], 0.085, 0.02, p.trim, FLAT);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.cone([Math.sin(a) * 0.085, 0.72, Math.cos(a) * 0.085], 0.02, 0.06, p.trim);
  }
  freeArm(b, [-0.1, 0.43, 0], [-0.14, 0.33, -0.07], p.armor);
  // Sceptre.
  weaponArm(b, [0.1, 0.43, 0], [0.15, 0.33, -0.08], p.armor);
  b.cylinder([0.15, 0.48, -0.08], 0.012, 0.012, 0.42, p.trim, undefined, 'weapon');
  b.sphere([0.15, 0.71, -0.08], 0.045, p.cloth, [1, 1, 1], 'weapon');
  b.torus([0.15, 0.71, -0.08], 0.05, 0.01, p.trim, FLAT, 'weapon');
  return b.build(1.3, [0.1, 0.43, 0]);
};

const king = (b: FigureBuilder): Figure => {
  const p = b.palette;
  // Robe, ermine collar and cape.
  b.cylinder([0, 0.21, 0], 0.1, 0.2, 0.42, p.cloth);
  b.torus([0, 0.02, 0], 0.195, 0.018, p.trim, FLAT);
  b.box([0, 0.27, 0.13], [0.3, 0.46, 0.03], p.cloth, new Euler(0.18, 0, 0));
  b.torus([0, 0.42, 0], 0.11, 0.035, p.beard, FLAT);
  head(b, 0.56);
  b.sphere([0, 0.47, -0.1], 1, p.beard, [0.09, 0.1, 0.05]);
  // Crown with a cross.
  b.cylinder([0, 0.7, 0], 0.11, 0.1, 0.08, p.trim);
  b.box([0, 0.79, 0], [0.022, 0.1, 0.022], p.trim);
  b.box([0, 0.8, 0], [0.07, 0.022, 0.022], p.trim);
  freeArm(b, [-0.12, 0.41, 0], [-0.14, 0.31, -0.08], p.cloth);
  weaponArm(b, [0.12, 0.41, 0], [0.16, 0.31, -0.08], p.cloth);
  sword(b, [0.16, 0.31, -0.08], 0.32);
  return b.build(1.36, [0.12, 0.41, 0]);
};

const BUILDERS: Record<PieceType, (b: FigureBuilder) => Figure> = {
  p: pawn,
  n: knight,
  b: bishop,
  r: rook,
  q: queen,
  k: king,
};

const cache = new Map<string, Figure>();

/** The figure for a piece, built once and shared by every piece of that type and side. */
export const figureFor = (type: PieceType, side: Side): Figure => {
  const key = `${side}${type}`;
  let figure = cache.get(key);
  if (!figure) {
    figure = BUILDERS[type](new FigureBuilder(PALETTES[side]));
    cache.set(key, figure);
  }
  return figure;
};

/** Which way a figure faces when resting: towards the opponent. */
export const figureRestYaw = (side: Side): number => (side === 'white' ? 0 : Math.PI);

/** Yaw that turns a figure (built facing -Z) towards a horizontal direction. */
export const figureYawTowards = (dir: Vector3): number => Math.atan2(-dir.x, -dir.z);
