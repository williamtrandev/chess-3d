import {
  BoxGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PieceType } from '@/lib/board';

/**
 * Procedural chess pieces. One board square is 1 unit wide; profiles are
 * `[radius, height]` pairs revolved around the Y axis.
 */
type Profile = [number, number][];

const SEGMENTS = 48;

const base = (r: number): Profile => [
  [0, 0],
  [r, 0],
  [r, 0.05],
  [r - 0.03, 0.08],
  [r - 0.06, 0.1],
  [r - 0.05, 0.13],
  [r - 0.09, 0.16],
];

/** Points on a circle of radius `r` centered at height `cy`, from angle a0 to a1 (radians, 0 = up). */
const arc = (r: number, cy: number, a0: number, a1: number, steps = 10): Profile =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / steps;
    return [Math.max(0, r * Math.sin(a)), cy + r * Math.cos(a)];
  });

const lathe = (profile: Profile): BufferGeometry =>
  new LatheGeometry(
    profile.map(([x, y]) => new Vector2(x, y)),
    SEGMENTS,
  );

const PROFILES: Record<Exclude<PieceType, 'n'>, Profile> = {
  p: [
    ...base(0.3),
    [0.13, 0.28],
    [0.09, 0.37],
    [0.15, 0.4],
    [0.15, 0.43],
    [0.08, 0.45],
    ...arc(0.13, 0.56, Math.PI - 0.6, 0),
  ],
  r: [
    ...base(0.33),
    [0.2, 0.22],
    [0.17, 0.52],
    [0.24, 0.56],
    [0.24, 0.78],
    [0.16, 0.78],
    [0.16, 0.72],
    [0, 0.72],
  ],
  b: [
    ...base(0.31),
    [0.13, 0.3],
    [0.09, 0.56],
    [0.17, 0.59],
    [0.17, 0.62],
    [0.09, 0.64],
    [0.13, 0.7],
    [0.15, 0.78],
    [0.12, 0.88],
    [0.05, 0.95],
    ...arc(0.04, 0.98, Math.PI, 0, 6),
  ],
  q: [
    ...base(0.34),
    [0.15, 0.3],
    [0.1, 0.68],
    [0.2, 0.73],
    [0.2, 0.76],
    [0.12, 0.79],
    [0.15, 0.88],
    [0.21, 0.97],
    [0.17, 0.99],
    [0.08, 0.98],
    ...arc(0.06, 1.03, Math.PI - 0.4, 0, 6),
  ],
  k: [
    ...base(0.35),
    [0.16, 0.3],
    [0.11, 0.74],
    [0.21, 0.79],
    [0.21, 0.82],
    [0.13, 0.85],
    [0.17, 0.95],
    [0.2, 1.02],
    [0.1, 1.04],
    [0, 1.04],
  ],
};

const knight = (): BufferGeometry => {
  const pedestal = lathe([...base(0.32), [0.21, 0.2], [0.19, 0.26], [0, 0.26]]);

  // Side silhouette of the head, muzzle pointing towards +X.
  const outline: [number, number][] = [
    [-0.2, 0.22],
    [0.17, 0.22],
    [0.13, 0.38],
    [0.06, 0.5],
    [0.26, 0.6],
    [0.3, 0.68],
    [0.24, 0.76],
    [0.08, 0.84],
    [0.03, 0.96],
    [-0.04, 0.88],
    [-0.15, 0.8],
    [-0.23, 0.62],
    [-0.23, 0.4],
  ];
  const shape = new Shape(outline.map(([x, y]) => new Vector2(x, y)));
  const depth = 0.24;
  const head = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 4,
    curveSegments: 8,
  });
  head.translate(0, 0, -depth / 2);

  const eyes = [-1, 1].map((side) => {
    const eye = new SphereGeometry(0.022, 12, 8);
    eye.translate(0.12, 0.72, side * (depth / 2 + 0.03));
    return eye;
  });

  return mergeGeometries([
    pedestal.toNonIndexed(),
    head.toNonIndexed(),
    ...eyes.map((e) => e.toNonIndexed()),
  ]);
};

const king = (): BufferGeometry => {
  const body = lathe(PROFILES.k);
  const vertical = new BoxGeometry(0.05, 0.2, 0.05);
  vertical.translate(0, 1.13, 0);
  const horizontal = new BoxGeometry(0.15, 0.05, 0.05);
  horizontal.translate(0, 1.15, 0);
  return mergeGeometries([body.toNonIndexed(), vertical.toNonIndexed(), horizontal.toNonIndexed()]);
};

const rook = (): BufferGeometry => {
  const body = lathe(PROFILES.r);
  // Battlements: four blocks around the rim.
  const blocks = [0, 1, 2, 3].map((i) => {
    const block = new BoxGeometry(0.1, 0.08, 0.08);
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    block.rotateY(-angle);
    block.translate(Math.cos(angle) * 0.2, 0.82, Math.sin(angle) * 0.2);
    return block.toNonIndexed();
  });
  return mergeGeometries([body.toNonIndexed(), ...blocks]);
};

/** Build one geometry per piece type. Call once and share between all pieces. */
export const createPieceGeometries = (): Record<PieceType, BufferGeometry> => ({
  p: lathe(PROFILES.p),
  r: rook(),
  n: knight(),
  b: lathe(PROFILES.b),
  q: lathe(PROFILES.q),
  k: king(),
});
