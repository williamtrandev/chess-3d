import { Vector3 } from 'three';
import { seededRandom } from './scenery';

export interface BranchSegment {
  from: Vector3;
  to: Vector3;
  radiusFrom: number;
  radiusTo: number;
}

export interface Blossom {
  position: Vector3;
  scale: number;
  /** 0…1, picks a shade from the blossom palette. */
  tint: number;
}

export interface TreeShape {
  segments: BranchSegment[];
  blossoms: Blossom[];
}

const UP = new Vector3(0, 1, 0);

/** Branch levels: trunk, main limbs, secondary limbs, twigs. */
const LEVELS = [
  { length: 2.8, radius: 0.5, children: [3, 4] },
  { length: 3.3, radius: 0.32, children: [2, 3] },
  { length: 2.3, radius: 0.18, children: [2, 3] },
  { length: 1.5, radius: 0.09, children: [0, 0] },
] as const;

/**
 * Grows a Japanese cherry tree: a short leaning trunk that splits into wide, spreading
 * limbs, ending in dense clusters of blossom that form a broad, umbrella-like crown.
 * Deterministic for a given seed. Units are world units, with the base at the origin.
 */
export const growCherryTree = (seed: number): TreeShape => {
  const random = seededRandom(seed);
  const segments: BranchSegment[] = [];
  const blossoms: Blossom[] = [];

  const cluster = (center: Vector3, count: number, spread: number, size: number) => {
    for (let i = 0; i < count; i++) {
      const offset = new Vector3(
        random() - 0.5,
        (random() - 0.35) * 0.7,
        random() - 0.5,
      ).multiplyScalar(spread * 2);
      blossoms.push({
        position: center.clone().add(offset),
        scale: size * (0.65 + random() * 0.55),
        tint: random(),
      });
    }
  };

  const grow = (from: Vector3, dir: Vector3, level: number, scale: number) => {
    const spec = LEVELS[level];
    if (!spec) return;
    const length = spec.length * scale * (0.85 + random() * 0.3);
    const radius = spec.radius * scale;

    // A gentle kink halfway makes the limb look gnarled rather than straight.
    const side = new Vector3().crossVectors(dir, UP);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize().applyAxisAngle(dir, random() * Math.PI * 2);
    const mid = from
      .clone()
      .addScaledVector(dir, length * 0.5)
      .addScaledVector(side, length * 0.12);
    const to = from
      .clone()
      .addScaledVector(dir, length)
      .addScaledVector(side, length * 0.04);
    segments.push({ from, to: mid, radiusFrom: radius, radiusTo: radius * 0.86 });
    segments.push({ from: mid, to, radiusFrom: radius * 0.86, radiusTo: radius * 0.68 });

    if (level >= 2) cluster(mid, 2, 0.5, 0.55);
    const [min, max] = spec.children;
    const count = min + Math.floor(random() * (max - min + 1));
    if (count === 0) {
      cluster(to, 9, 0.9, 0.75);
      return;
    }

    const start = random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      let child: Vector3;
      if (level === 0) {
        // Main limbs fan out evenly around the trunk, reaching outwards and up.
        const angle = start + (i / count) * Math.PI * 2 + (random() - 0.5) * 0.6;
        child = new Vector3(Math.cos(angle) * 0.8, 0.55 + random() * 0.2, Math.sin(angle) * 0.8);
      } else {
        const turn = (i % 2 ? 1 : -1) * (0.35 + random() * 0.45);
        child = dir.clone().applyAxisAngle(UP, turn);
        child.y = child.y * 0.55 - (level === 2 ? 0.12 : 0) + (random() - 0.5) * 0.2;
      }
      grow(to, child.normalize(), level + 1, scale);
    }
  };

  const lean = new Vector3((random() - 0.5) * 0.35, 1, (random() - 0.5) * 0.35).normalize();
  grow(new Vector3(0, 0, 0), lean, 0, 0.9 + random() * 0.3);
  return { segments, blossoms };
};

/** Points of a slack string hanging between two posts (parabola approximating a catenary). */
export const hangingPoints = (from: Vector3, to: Vector3, sag: number, count: number): Vector3[] =>
  Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return from
      .clone()
      .lerp(to, t)
      .add(new Vector3(0, -4 * sag * t * (1 - t), 0));
  });
