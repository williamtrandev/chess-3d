'use client';

import { useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  IcosahedronGeometry,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
  type InstancedMesh,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { segmentRotation } from '@/lib/rig';
import { GROUND_Y, fbm, gardenHeight, seededRandom } from '@/lib/scenery';
import { growCherryTree, type TreeShape } from '@/lib/trees';
import { Clouds, Flock, Terrain } from './common';

const BLOSSOMS = ['#f6b3cc', '#f29bbd', '#f8c3d6', '#ee8fb6', '#fad4e2', '#e57fa8'];
const UP = new Vector3(0, 1, 0);
const BIRD_RADIUS: [number, number] = [30, 70];
const BIRD_HEIGHT: [number, number] = [18, 32];

const TREE_COUNT = 9;

interface PlacedTree {
  x: number;
  z: number;
  y: number;
  turn: number;
  shape: TreeShape;
}

/** Where the cherry trees stand, leaving the players' lines of sight open. */
const placeTrees = (): PlacedTree[] => {
  const random = seededRandom(83);
  const list: PlacedTree[] = [];
  while (list.length < TREE_COUNT) {
    const a = random() * Math.PI * 2;
    const r = 19 + random() * 30;
    if (r < 32 && Math.abs(Math.cos(a)) < 0.55) continue;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (list.some((t) => Math.hypot(t.x - x, t.z - z) < 11)) continue;
    list.push({
      x,
      z,
      y: gardenHeight(x, z) - 0.15,
      turn: random() * Math.PI * 2,
      shape: growCherryTree(list.length * 7 + 1),
    });
  }
  return list;
};

/** One merged mesh per tree for trunk and limbs: tapered cylinders between branch points. */
const barkGeometry = (shape: TreeShape) => {
  const parts = shape.segments.map(({ from, to, radiusFrom, radiusTo }) => {
    const length = from.distanceTo(to);
    const g = new CylinderGeometry(radiusTo, radiusFrom, length, 7, 1, false);
    g.applyQuaternion(segmentRotation(from, to));
    g.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
    return g;
  });
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged;
};

function CherryTrees({ trees }: { trees: PlacedTree[] }) {
  const bark = useMemo(() => new MeshStandardMaterial({ color: '#3b2620', roughness: 1 }), []);
  const trunks = useMemo(
    () => trees.map((tree) => ({ tree, geometry: barkGeometry(tree.shape) })),
    [trees],
  );
  useEffect(
    () => () => {
      bark.dispose();
      trunks.forEach((t) => t.geometry.dispose());
    },
    [bark, trunks],
  );

  // All blossoms of all trees in one instanced mesh, each puff tinted from the palette.
  const blossomCount = useMemo(
    () => trees.reduce((n, t) => n + t.shape.blossoms.length, 0),
    [trees],
  );
  const blossoms = useRef<InstancedMesh>(null);
  const blossomGeometry = useMemo(() => new IcosahedronGeometry(1, 1), []);
  useEffect(() => () => blossomGeometry.dispose(), [blossomGeometry]);
  useEffect(() => {
    const mesh = blossoms.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    let i = 0;
    for (const tree of trees) {
      for (const b of tree.shape.blossoms) {
        dummy.position
          .copy(b.position)
          .applyAxisAngle(UP, tree.turn)
          .add(new Vector3(tree.x, tree.y, tree.z));
        dummy.rotation.set(b.tint * 6, b.tint * 9, 0);
        dummy.scale.set(b.scale * 1.15, b.scale * 0.85, b.scale * 1.15);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.set(BLOSSOMS[Math.floor(b.tint * BLOSSOMS.length)] ?? '#f7b7d2'));
        i++;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [trees]);

  return (
    <group>
      {trunks.map(({ tree, geometry }, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={bark}
          position={[tree.x, tree.y, tree.z]}
          rotation-y={tree.turn}
          castShadow
          receiveShadow
        />
      ))}
      <instancedMesh ref={blossoms} args={[blossomGeometry, undefined, blossomCount]} castShadow>
        <meshStandardMaterial
          roughness={0.85}
          flatShading
          emissive="#ff9cc4"
          emissiveIntensity={0.12}
        />
      </instancedMesh>
    </group>
  );
}

/** Petals that have already fallen, carpeting the ground under each tree. */
function FallenPetals({ trees, perTree }: { trees: PlacedTree[]; perTree: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = new CircleGeometry(0.16, 5);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const random = seededRandom(101);
    const dummy = new Object3D();
    const color = new Color();
    let i = 0;
    for (const tree of trees) {
      for (let k = 0; k < perTree; k++) {
        const r = Math.sqrt(random()) * 7.5;
        const a = random() * Math.PI * 2;
        const x = tree.x + Math.cos(a) * r;
        const z = tree.z + Math.sin(a) * r;
        dummy.position.set(x, gardenHeight(x, z) + 0.03, z);
        dummy.rotation.set(0, random() * Math.PI, 0);
        dummy.scale.setScalar(0.6 + random() * 0.8);
        dummy.updateMatrix();
        instanced.setMatrixAt(i, dummy.matrix);
        instanced.setColorAt(
          i,
          color.set(BLOSSOMS[Math.floor(random() * BLOSSOMS.length)] ?? '#f7b7d2'),
        );
        i++;
      }
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [trees, perTree]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, trees.length * perTree]} receiveShadow>
      <meshStandardMaterial roughness={0.9} side={DoubleSide} />
    </instancedMesh>
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
  const trees = useMemo(() => placeTrees(), []);
  const paint = useCallback((x: number, _y: number, z: number, color: Color) => {
    color.set('#6b8c4a').lerp(new Color('#4f7036'), fbm(x * 0.06, z * 0.06, 3));
  }, []);
  return (
    <group>
      <Terrain size={420} segments={160} height={gardenHeight} paint={paint} />
      <Gravel />
      <CherryTrees trees={trees} />
      <FallenPetals trees={trees} perTree={quality === 'high' ? 260 : 90} />
      <Petals count={quality === 'high' ? 900 : 300} />
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
