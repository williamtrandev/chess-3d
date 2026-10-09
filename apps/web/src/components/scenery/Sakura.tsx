'use client';

import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  TubeGeometry,
  Vector3,
  type InstancedMesh,
} from 'three';
import { GROUND_Y, fbm, gardenHeight, seededRandom } from '@/lib/scenery';
import { Clouds, Flock, Terrain } from './common';

const BLOSSOMS = ['#f7b7d2', '#f9cadd', '#f2a1c3', '#fbd6e4'];
const BIRD_RADIUS: [number, number] = [30, 70];
const BIRD_HEIGHT: [number, number] = [18, 32];

function CherryTrees() {
  const blossom = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const materials = useMemo(
    () => ({
      bark: new MeshStandardMaterial({ color: '#3f2a22', roughness: 1 }),
      petals: BLOSSOMS.map(
        (c) => new MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }),
      ),
    }),
    [],
  );
  useEffect(
    () => () => {
      blossom.dispose();
      materials.bark.dispose();
      materials.petals.forEach((m) => m.dispose());
    },
    [blossom, materials],
  );
  const trees = useMemo(() => {
    const random = seededRandom(83);
    const list: {
      x: number;
      z: number;
      s: number;
      trunk: TubeGeometry;
      blooms: [number, number, number, number, number][];
    }[] = [];
    while (list.length < 11) {
      const a = random() * Math.PI * 2;
      const r = 17 + random() * 32;
      if (r < 30 && Math.abs(Math.cos(a)) < 0.5) continue;
      const lean = new Vector3((random() - 0.5) * 3, 0, (random() - 0.5) * 3);
      const curve = new CatmullRomCurve3([
        new Vector3(0, 0, 0),
        new Vector3(lean.x * 0.3, 2.5, lean.z * 0.3),
        new Vector3(lean.x, 5, lean.z),
      ]);
      list.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        s: 0.9 + random() * 0.5,
        trunk: new TubeGeometry(curve, 12, 0.38, 8, false),
        blooms: Array.from({ length: 8 }, () => [
          lean.x + (random() - 0.5) * 5,
          5.2 + random() * 2.4,
          lean.z + (random() - 0.5) * 5,
          1 + random() * 1.1,
          Math.floor(random() * BLOSSOMS.length),
        ]),
      });
    }
    return list;
  }, []);
  useEffect(() => () => trees.forEach((t) => t.trunk.dispose()), [trees]);

  return (
    <group>
      {trees.map((tree, i) => (
        <group
          key={i}
          position={[tree.x, gardenHeight(tree.x, tree.z) - 0.2, tree.z]}
          scale={tree.s}
        >
          <mesh geometry={tree.trunk} material={materials.bark} castShadow />
          {tree.blooms.map(([x, y, z, s, c], j) => (
            <mesh
              key={j}
              geometry={blossom}
              material={materials.petals[c] ?? materials.bark}
              position={[x, y, z]}
              scale={[s * 1.4, s, s * 1.4]}
              castShadow
            />
          ))}
        </group>
      ))}
    </group>
  );
}

/** Pink petals tumbling down through the garden. */
function Petals({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new PlaneGeometry(0.28, 0.2), []);
  const state = useMemo(() => {
    const random = seededRandom(91);
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 80,
      y: GROUND_Y + random() * 16,
      z: (random() - 0.5) * 80,
      phase: random() * Math.PI * 2,
      fall: 0.6 + random() * 0.8,
    }));
  }, [count]);
  const dummy = useMemo(() => new Object3D(), []);

  useFrame(({ clock }, delta) => {
    const instanced = mesh.current;
    if (!instanced) return;
    const t = clock.elapsedTime;
    state.forEach((p, i) => {
      p.y -= p.fall * delta;
      p.x += Math.sin(t * 0.8 + p.phase) * delta * 0.8 + delta * 0.4;
      if (p.y < GROUND_Y + 0.05) {
        p.y = GROUND_Y + 16;
        p.x = ((p.x + 40) % 80) - 40;
      }
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(t * 1.3 + p.phase, t * 0.9 + p.phase, t * 1.7);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial color="#f9b8d0" side={DoubleSide} roughness={0.7} />
    </instancedMesh>
  );
}

/** Raked gravel circles around the table, like a Zen garden. */
function Gravel() {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ddd7c8';
    context.fillRect(0, 0, 1024, 1024);
    context.strokeStyle = 'rgba(120, 110, 90, 0.35)';
    context.lineWidth = 5;
    for (let r = 12; r < 512; r += 15) {
      context.beginPath();
      context.arc(512, 512, r, 0, Math.PI * 2);
      context.stroke();
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y + 0.02} receiveShadow>
      <circleGeometry args={[20, 96]} />
      <meshStandardMaterial map={texture} roughness={1} />
    </mesh>
  );
}

function StoneLantern({ x, z }: { x: number; z: number }) {
  const stone = '#9ca3af';
  return (
    <group position={[x, GROUND_Y, z]}>
      <mesh position-y={0.25} castShadow>
        <boxGeometry args={[1.3, 0.5, 1.3]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
      <mesh position-y={1.2} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.4, 8]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
      <mesh position-y={2.25} castShadow>
        <boxGeometry args={[1, 0.8, 1]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
      <mesh position={[0, 2.25, 0]}>
        <boxGeometry args={[1.02, 0.4, 0.6]} />
        <meshStandardMaterial color="#ffd28a" emissive="#ffb347" emissiveIntensity={1.4} />
      </mesh>
      <mesh position-y={2.95} rotation-y={Math.PI / 4} castShadow>
        <coneGeometry args={[1.25, 0.7, 4]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
      <mesh position-y={3.4}>
        <sphereGeometry args={[0.18, 12, 8]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
    </group>
  );
}

function Torii() {
  const red = '#c8102e';
  const z = -52;
  const y = gardenHeight(0, z);
  return (
    <group position={[0, y, z]}>
      {[-4.5, 4.5].map((x) => (
        <mesh key={x} position={[x, 5, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.55, 10, 16]} />
          <meshStandardMaterial color={red} roughness={0.6} />
        </mesh>
      ))}
      <mesh position-y={8.2} castShadow>
        <boxGeometry args={[11, 0.7, 0.8]} />
        <meshStandardMaterial color={red} roughness={0.6} />
      </mesh>
      <mesh position-y={10.2} castShadow>
        <boxGeometry args={[13.5, 0.8, 1.2]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.6} />
      </mesh>
      <mesh position-y={9.6}>
        <boxGeometry args={[12.5, 0.5, 1]} />
        <meshStandardMaterial color={red} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Pond() {
  const x = 24;
  const z = 8;
  return (
    <group position={[x, GROUND_Y + 0.04, z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[6.5, 48]} />
        <meshStandardMaterial color="#2d5d78" metalness={0.4} roughness={0.08} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 6.7, 0.2, Math.sin(a) * 6.7]}
            rotation={[i, i * 2, 0]}
            castShadow
          >
            <dodecahedronGeometry args={[0.6 + (i % 3) * 0.25, 0]} />
            <meshStandardMaterial color="#7c8087" roughness={0.9} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/** Japanese garden in spring: cherry blossoms, falling petals, raked gravel and a torii. */
export function Sakura({ quality }: { quality: 'high' | 'low' }) {
  const paint = useCallback((x: number, _y: number, z: number, color: Color) => {
    color.set('#6b8c4a').lerp(new Color('#4f7036'), fbm(x * 0.06, z * 0.06, 3));
  }, []);
  return (
    <group>
      <Terrain size={420} segments={160} height={gardenHeight} paint={paint} />
      <Gravel />
      <CherryTrees />
      <Petals count={quality === 'high' ? 700 : 250} />
      {[
        [10, 10],
        [-10, 10],
        [10, -10],
        [-10, -10],
      ].map(([x, z]) => (
        <StoneLantern key={`${x},${z}`} x={x ?? 0} z={z ?? 0} />
      ))}
      <Torii />
      <Pond />
      <Clouds count={12} seed={13} color="#fff5f8" />
      <Flock
        count={5}
        color="#3a3a44"
        radius={BIRD_RADIUS}
        height={BIRD_HEIGHT}
        size={1.2}
        seed={27}
      />
    </group>
  );
}
