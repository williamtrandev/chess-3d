'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshStandardMaterial,
  type Group,
} from 'three';
import { seededRandom } from '@/lib/scenery';

/** Puffy low-poly clouds drifting slowly across the sky, wrapping around at the edge. */
export function Clouds({
  count = 16,
  seed = 1,
  color = '#ffffff',
}: {
  count?: number;
  seed?: number;
  color?: string;
}) {
  const geometry = useMemo(() => new IcosahedronGeometry(1, 2), []);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color,
        roughness: 1,
        emissive: color,
        emissiveIntensity: 0.35,
        flatShading: true,
      }),
    [color],
  );
  const clouds = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 520,
      y: 55 + random() * 45,
      z: -60 - random() * 260 * (random() < 0.75 ? 1 : -1),
      speed: 1.2 + random() * 2.2,
      scale: 6 + random() * 9,
      puffs: Array.from({ length: 4 + Math.floor(random() * 4) }, (_, i) => ({
        x: (i - 2) * 1.3 + (random() - 0.5),
        y: (random() - 0.3) * 0.7,
        z: (random() - 0.5) * 1.4,
        s: 0.8 + random() * 0.9,
      })),
    }));
  }, [count, seed]);

  const refs = useRef<(Group | null)[]>([]);
  useFrame((_, delta) => {
    clouds.forEach((cloud, i) => {
      const group = refs.current[i];
      if (!group) return;
      group.position.x += cloud.speed * delta;
      if (group.position.x > 280) group.position.x = -280;
    });
  });

  return (
    <group>
      {clouds.map((cloud, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
          position={[cloud.x, cloud.y, cloud.z]}
          scale={[cloud.scale, cloud.scale * 0.55, cloud.scale * 0.8]}
        >
          {cloud.puffs.map((p, j) => (
            <mesh
              key={j}
              geometry={geometry}
              material={material}
              position={[p.x, p.y, p.z]}
              scale={p.s}
            />
          ))}
        </group>
      ))}
    </group>
  );
}

const wingGeometry = (() => {
  const g = new BufferGeometry();
  // A swept wing: root at the body, tip pointing to +X.
  g.setAttribute(
    'position',
    new Float32BufferAttribute([0, 0, -0.18, 0, 0, 0.22, 1, 0.05, 0.12], 3),
  );
  g.computeVertexNormals();
  return g;
})();

interface FlockProps {
  count: number;
  color: string;
  /** Radius range of the circles the birds fly around. */
  radius: [number, number];
  height: [number, number];
  size?: number;
  flapSpeed?: number;
  seed?: number;
}

/** Birds (or butterflies) circling around the scene with flapping wings. */
export function Flock({
  count,
  color,
  radius,
  height,
  size = 1,
  flapSpeed = 9,
  seed = 3,
}: FlockProps) {
  const material = useMemo(
    () => new MeshStandardMaterial({ color, side: DoubleSide, roughness: 0.8 }),
    [color],
  );
  const birds = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: count }, () => ({
      radius: radius[0] + random() * (radius[1] - radius[0]),
      height: height[0] + random() * (height[1] - height[0]),
      angle: random() * Math.PI * 2,
      speed: (0.08 + random() * 0.12) * (random() < 0.5 ? -1 : 1),
      bob: random() * Math.PI * 2,
      flap: flapSpeed * (0.8 + random() * 0.4),
    }));
  }, [count, radius, height, flapSpeed, seed]);

  const bodies = useRef<(Group | null)[]>([]);
  const left = useRef<(Group | null)[]>([]);
  const right = useRef<(Group | null)[]>([]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    birds.forEach((bird, i) => {
      bird.angle += bird.speed * delta * (12 / Math.max(6, bird.radius));
      const body = bodies.current[i];
      if (body) {
        const x = Math.cos(bird.angle) * bird.radius;
        const z = Math.sin(bird.angle) * bird.radius;
        body.position.set(x, bird.height + Math.sin(t * 0.8 + bird.bob) * 1.2, z);
        // Face along the direction of travel.
        body.rotation.y = -bird.angle + (bird.speed > 0 ? 0 : Math.PI);
      }
      const flap = Math.sin(t * bird.flap + bird.bob) * 0.7;
      left.current[i]?.rotation.set(0, 0, flap);
      right.current[i]?.rotation.set(0, Math.PI, flap);
    });
  });

  return (
    <group>
      {birds.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            bodies.current[i] = g;
          }}
          scale={size}
        >
          <group
            ref={(g) => {
              left.current[i] = g;
            }}
          >
            <mesh geometry={wingGeometry} material={material} />
          </group>
          <group
            ref={(g) => {
              right.current[i] = g;
            }}
          >
            <mesh geometry={wingGeometry} material={material} />
          </group>
        </group>
      ))}
    </group>
  );
}
