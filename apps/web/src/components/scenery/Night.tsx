'use client';

import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  Line,
  LineBasicMaterial,
  Object3D,
  SphereGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
  type PointLight,
} from 'three';
import { GROUND_Y, fieldHeight, seededRandom } from '@/lib/scenery';
import { hangingPoints } from '@/lib/trees';
import { Particles } from './common';

export const MOON = new Vector3(-90, 95, -170);

const LANTERN_COLORS: [number, number, number][] = [
  [2.4, 0.45, 0.22], // red
  [2.6, 1.05, 0.3], // orange
  [2.6, 1.9, 0.6], // warm yellow
];

/** Festival ring: tall posts around the clearing, strings of paper lanterns between them. */
const RING_POSTS = 8;
const RING_RADIUS = 22;
const RING_POST_HEIGHT = 11;
const PER_STRING = 7;

/** Big lanterns on tall posts near the table; these carry real lights. */
const NEAR_POSTS = [0.785, 2.356, 3.927, 5.498].map(
  (a) => [Math.cos(a) * 13, Math.sin(a) * 13] as const,
);
const NEAR_POST_HEIGHT = 9.5;

const ringLayout = () => {
  const posts = Array.from({ length: RING_POSTS }, (_, i) => {
    const a = ((i + 0.5) / RING_POSTS) * Math.PI * 2;
    const x = Math.cos(a) * RING_RADIUS;
    const z = Math.sin(a) * RING_RADIUS;
    return new Vector3(x, fieldHeight(x, z) + RING_POST_HEIGHT, z);
  });
  const strings = posts.map((post, i) => {
    const next = posts[(i + 1) % posts.length] ?? post;
    return {
      curve: hangingPoints(post, next, 1.8, 24),
      lanterns: hangingPoints(post, next, 1.8, PER_STRING + 2).slice(1, -1),
    };
  });
  return { posts, strings };
};

function FestivalLanterns() {
  const { posts, strings } = useMemo(() => ringLayout(), []);
  const anchors = useMemo(() => strings.flatMap((s) => s.lanterns), [strings]);
  const body = useRef<InstancedMesh>(null);
  const caps = useRef<InstancedMesh>(null);
  const geometry = useMemo(
    () => ({
      body: new SphereGeometry(0.45, 16, 12),
      cap: new CylinderGeometry(0.22, 0.22, 0.12, 10),
    }),
    [],
  );
  const lines = useMemo(
    () =>
      strings.map((s) => {
        const g = new BufferGeometry().setFromPoints(s.curve);
        return new Line(g, new LineBasicMaterial({ color: '#2b1b12' }));
      }),
    [strings],
  );
  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.cap.dispose();
      lines.forEach((l) => {
        l.geometry.dispose();
        (l.material as LineBasicMaterial).dispose();
      });
    },
    [geometry, lines],
  );

  useEffect(() => {
    const mesh = body.current;
    if (!mesh) return;
    const color = new Color();
    anchors.forEach((_, i) => {
      const [r, g, b] = LANTERN_COLORS[i % LANTERN_COLORS.length] ?? [2, 1, 0.4];
      mesh.setColorAt(i, color.setRGB(r, g, b));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [anchors]);

  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const lanterns = body.current;
    const ends = caps.current;
    if (!lanterns || !ends) return;
    const t = clock.elapsedTime;
    anchors.forEach((anchor, i) => {
      const swing = Math.sin(t * 1.3 + i * 0.7) * 0.12;
      // Each lantern hangs 0.7 below the string and swings about its knot.
      const hang = new Vector3(Math.sin(swing) * 0.7, -0.7 * Math.cos(swing), 0);
      dummy.position.copy(anchor).add(hang);
      dummy.rotation.set(0, i, swing);
      dummy.scale.set(1, 1.3, 1);
      dummy.updateMatrix();
      lanterns.setMatrixAt(i, dummy.matrix);
      for (const [k, dy] of [
        [0, 0.6],
        [1, -0.6],
      ] as const) {
        dummy.position
          .copy(anchor)
          .add(hang)
          .add(new Vector3(-Math.sin(swing) * dy, Math.cos(swing) * dy, 0));
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        ends.setMatrixAt(i * 2 + k, dummy.matrix);
      }
    });
    lanterns.instanceMatrix.needsUpdate = true;
    ends.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {posts.map((top, i) => (
        <mesh key={i} position={[top.x, top.y - RING_POST_HEIGHT / 2, top.z]} castShadow>
          <cylinderGeometry args={[0.14, 0.2, RING_POST_HEIGHT, 8]} />
          <meshStandardMaterial color="#2a1d14" roughness={0.8} />
        </mesh>
      ))}
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
      <instancedMesh
        ref={body}
        args={[geometry.body, undefined, anchors.length]}
        frustumCulled={false}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        ref={caps}
        args={[geometry.cap, undefined, anchors.length * 2]}
        frustumCulled={false}
      >
        <meshStandardMaterial color="#3a1a10" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

function PostLantern({ x, z, index }: { x: number; z: number; index: number }) {
  const light = useRef<PointLight>(null);
  const lantern = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (light.current) light.current.intensity = 90 + Math.sin(t * 7 + index * 3) * 8;
    if (lantern.current) lantern.current.rotation.z = Math.sin(t * 1.1 + index) * 0.08;
  });
  const y = fieldHeight(x, z);
  // The arm points towards the table, so the lantern hangs over the clearing.
  const inward = Math.atan2(-z, -x);
  return (
    <group position={[x, y, z]}>
      <mesh position-y={NEAR_POST_HEIGHT / 2} castShadow>
        <cylinderGeometry args={[0.12, 0.17, NEAR_POST_HEIGHT, 8]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.8} />
      </mesh>
      <group rotation-y={-inward}>
        <mesh position={[0.9, NEAR_POST_HEIGHT - 0.2, 0]}>
          <boxGeometry args={[1.8, 0.1, 0.1]} />
          <meshStandardMaterial color="#2a1d14" />
        </mesh>
        <group ref={lantern} position={[1.7, NEAR_POST_HEIGHT - 0.2, 0]}>
          <mesh position-y={-1.2} scale={[1, 1.35, 1]}>
            <sphereGeometry args={[0.7, 24, 16]} />
            <meshBasicMaterial color={[2.6, 0.9, 0.35]} toneMapped={false} />
          </mesh>
          {[-0.25, -2.15].map((dy) => (
            <mesh key={dy} position-y={dy}>
              <cylinderGeometry args={[0.32, 0.32, 0.16, 12]} />
              <meshStandardMaterial color="#3a1a10" />
            </mesh>
          ))}
          <pointLight
            ref={light}
            position-y={-1.2}
            color="#ffae5c"
            intensity={90}
            distance={40}
            decay={2}
          />
        </group>
      </group>
    </group>
  );
}

/** Sky lanterns released in the distance, rising slowly into the night. */
function SkyLanterns({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new CylinderGeometry(0.9, 0.65, 1.5, 10), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const state = useMemo(() => {
    const random = seededRandom(61);
    return Array.from({ length: count }, () => {
      const a = random() * Math.PI * 2;
      const r = 70 + random() * 160;
      return {
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        y: random() * 110,
        speed: 0.6 + random() * 0.9,
        phase: random() * 6,
      };
    });
  }, [count]);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }, delta) => {
    const instanced = mesh.current;
    if (!instanced) return;
    state.forEach((p, i) => {
      p.y += p.speed * delta;
      if (p.y > 120) p.y = 0;
      dummy.position.set(
        p.x + Math.sin(clock.elapsedTime * 0.2 + p.phase) * 3,
        GROUND_Y + 8 + p.y,
        p.z,
      );
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial color={[2.6, 1.2, 0.4]} toneMapped={false} />
    </instancedMesh>
  );
}

/** Night sky with a moon, warm paper lanterns around the table and fireflies. */
export function NightExtras({ quality }: { quality: 'high' | 'low' }) {
  return (
    <group>
      <Stars
        radius={320}
        depth={80}
        count={quality === 'high' ? 5000 : 2000}
        factor={5}
        fade
        speed={0.4}
      />
      <mesh position={MOON}>
        <sphereGeometry args={[9, 32, 24]} />
        <meshStandardMaterial
          color="#fffbe6"
          emissive="#fff4c2"
          emissiveIntensity={2.2}
          toneMapped={false}
        />
      </mesh>
      <FestivalLanterns />
      {NEAR_POSTS.map(([x, z], i) => (
        <PostLantern key={i} x={x} z={z} index={i} />
      ))}
      <SkyLanterns count={quality === 'high' ? 36 : 14} />
      <Particles
        count={quality === 'high' ? 220 : 90}
        color="#f8f59a"
        size={0.35}
        radius={40}
        bottom={GROUND_Y + 0.6}
        top={GROUND_Y + 5}
        mode="float"
        speed={0.8}
        glow
        seed={33}
      />
    </group>
  );
}

/** Golden dust drifting in the evening light. */
export function SunsetMotes({ quality }: { quality: 'high' | 'low' }) {
  return (
    <Particles
      count={quality === 'high' ? 260 : 100}
      color="#ffd08a"
      size={0.18}
      radius={34}
      bottom={GROUND_Y + 0.5}
      top={GROUND_Y + 9}
      mode="float"
      speed={0.4}
      glow
      seed={44}
    />
  );
}
