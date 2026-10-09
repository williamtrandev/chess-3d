'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  MeshStandardMaterial,
  NormalBlending,
  PlaneGeometry,
  PointsMaterial,
  type Group,
  type Points,
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

/** Ground mesh shaped by a height function and colored per vertex. */
export function Terrain({
  size,
  segments,
  height,
  paint,
}: {
  size: number;
  segments: number;
  height: (x: number, z: number) => number;
  /** Sets `color` for a vertex at (x, y, z). */
  paint: (x: number, y: number, z: number, color: Color) => void;
}) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const position = g.attributes.position;
    if (!position) return g;
    const colors: number[] = [];
    const color = new Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const y = height(x, z);
      position.setY(i, y);
      paint(x, y, z, color);
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [size, segments, height, paint]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

const dotTexture = (() => {
  let texture: CanvasTexture | null = null;
  return () => {
    if (texture || typeof document === 'undefined') return texture;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    texture = new CanvasTexture(canvas);
    return texture;
  };
})();

interface ParticlesProps {
  count: number;
  color: string;
  size: number;
  /** Horizontal radius and vertical range of the volume the particles live in. */
  radius: number;
  bottom: number;
  top: number;
  /** `fall` drifts down and wraps to the top (snow); `float` wanders in place (fireflies). */
  mode: 'fall' | 'float';
  speed?: number;
  glow?: boolean;
  seed?: number;
}

/** Cheap point particles animated on the CPU: snowflakes, fireflies, golden dust. */
export function Particles({
  count,
  color,
  size,
  radius,
  bottom,
  top,
  mode,
  speed = 1,
  glow = false,
  seed = 2,
}: ParticlesProps) {
  const points = useRef<Points>(null);
  const { geometry, base, phase } = useMemo(() => {
    const random = seededRandom(seed);
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = Math.sqrt(random()) * radius;
      const a = random() * Math.PI * 2;
      base[i * 3] = Math.cos(a) * r;
      base[i * 3 + 1] = bottom + random() * (top - bottom);
      base[i * 3 + 2] = Math.sin(a) * r;
      phase[i] = random() * Math.PI * 2;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(base.slice(), 3));
    return { geometry: g, base, phase };
  }, [count, radius, bottom, top, seed]);
  const material = useMemo(
    () =>
      new PointsMaterial({
        color,
        size,
        map: dotTexture(),
        transparent: true,
        depthWrite: false,
        blending: glow ? AdditiveBlending : NormalBlending,
        sizeAttenuation: true,
      }),
    [color, size, glow],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }, delta) => {
    const position = points.current?.geometry.attributes.position;
    if (!position) return;
    const array = position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const p = phase[i] ?? 0;
      if (mode === 'fall') {
        let y = (array[i * 3 + 1] ?? 0) - speed * delta * (0.7 + (p % 1) * 0.6);
        if (y < bottom) y = top;
        array[i * 3 + 1] = y;
        array[i * 3] = (base[i * 3] ?? 0) + Math.sin(t * 0.6 + p) * 1.2;
        array[i * 3 + 2] = (base[i * 3 + 2] ?? 0) + Math.cos(t * 0.5 + p) * 1.2;
      } else {
        array[i * 3] = (base[i * 3] ?? 0) + Math.sin(t * 0.4 * speed + p) * 1.6;
        array[i * 3 + 1] = (base[i * 3 + 1] ?? 0) + Math.sin(t * 0.9 * speed + p * 2) * 0.6;
        array[i * 3 + 2] = (base[i * 3 + 2] ?? 0) + Math.cos(t * 0.35 * speed + p) * 1.6;
      }
    }
    position.needsUpdate = true;
    if (glow) material.opacity = 0.75 + Math.sin(t * 3) * 0.25;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}
