'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  type Group,
  type InstancedMesh,
} from 'three';
import { fieldHeight, fbm, seededRandom } from '@/lib/scenery';
import { Clouds, Flock } from './common';

const TERRAIN_SIZE = 520;

function Meadow() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 220, 220);
    g.rotateX(-Math.PI / 2);
    const position = g.attributes.position;
    if (!position) return g;
    const colors: number[] = [];
    const light = new Color('#7fb24a');
    const dark = new Color('#4a7d2c');
    const dry = new Color('#b8b45a');
    const c = new Color();
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      position.setY(i, fieldHeight(x, z));
      c.copy(dark).lerp(light, fbm(x * 0.05, z * 0.05, 3));
      c.lerp(dry, Math.max(0, fbm(x * 0.02 + 9, z * 0.02, 2) - 0.55) * 1.2);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} />
    </mesh>
  );
}

const GRASS_VERTEX = /* glsl */ `
  uniform float uTime;
  attribute float aTint;
  varying float vHeight;
  varying float vTint;
  #include <fog_pars_vertex>
  void main() {
    vHeight = uv.y;
    vTint = aTint;
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    float bend = uv.y * uv.y;
    float gust = sin(uTime * 0.45 + world.x * 0.04 + world.z * 0.03) * 0.5 + 0.5;
    float sway = sin(uTime * 1.7 + world.x * 0.35 + world.z * 0.22) * 0.6
               + sin(uTime * 2.9 + world.x * 0.9 - world.z * 0.4) * 0.15;
    world.x += sway * bend * (0.18 + gust * 0.32);
    world.z += cos(uTime * 1.3 + world.z * 0.31) * bend * 0.1;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const GRASS_FRAGMENT = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uSun;
  varying float vHeight;
  varying float vTint;
  #include <fog_pars_fragment>
  void main() {
    vec3 color = mix(uBase, uTip, vHeight);
    color *= 0.8 + vTint * 0.4;
    color += uSun * pow(vHeight, 4.0) * 0.18;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** A tapered blade, 1 unit tall, with `uv.y` going from 0 at the root to 1 at the tip. */
const bladeGeometry = () => {
  const segments = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const half = 0.055 * (1 - t) + 0.004;
    positions.push(-half, t, 0, half, t, 0);
    uvs.push(0, t, 1, t);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
};

function Grass({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => {
    const g = bladeGeometry();
    const random = seededRandom(11);
    g.setAttribute(
      'aTint',
      new InstancedBufferAttribute(
        Float32Array.from({ length: count }, () => random()),
        1,
      ),
    );
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: GRASS_VERTEX,
        fragmentShader: GRASS_FRAGMENT,
        side: DoubleSide,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uBase: { value: new Color('#2f5a1c') },
            uTip: { value: new Color('#a7d65a') },
            uSun: { value: new Color('#fff1c9') },
          },
        ]),
      }),
    [],
  );

  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const random = seededRandom(5);
    const dummy = new Object3D();
    for (let i = 0; i < count; i++) {
      // Denser near the table, sparser towards the hills.
      const r = 5.5 + 75 * random() ** 1.7;
      const a = random() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      dummy.position.set(x, fieldHeight(x, z) - 0.05, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      const h = 0.55 + random() * 0.7 + Math.max(0, fbm(x * 0.08, z * 0.08) - 0.5) * 1.2;
      dummy.scale.set(1 + random() * 0.6, h, 1);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    const uniform = (mesh.current?.material as ShaderMaterial | undefined)?.uniforms.uTime;
    if (uniform) uniform.value = clock.elapsedTime;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} />;
}

const FLOWER_COLORS = ['#ffffff', '#ffd23f', '#ff6b9a', '#b388ff', '#ff8c42'];

function Flowers({ count }: { count: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const geometry = useMemo(() => new IcosahedronGeometry(0.09, 0), []);
  useEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;
    const random = seededRandom(23);
    const dummy = new Object3D();
    const color = new Color();
    let placed = 0;
    while (placed < count) {
      // Flowers grow in patches.
      const cx = (random() - 0.5) * 80;
      const cz = (random() - 0.5) * 80;
      if (Math.hypot(cx, cz) < 9) continue;
      const tint = FLOWER_COLORS[Math.floor(random() * FLOWER_COLORS.length)] ?? '#ffffff';
      for (let k = 0; k < 18 && placed < count; k++, placed++) {
        const x = cx + (random() - 0.5) * 5;
        const z = cz + (random() - 0.5) * 5;
        dummy.position.set(x, fieldHeight(x, z) + 0.45 + random() * 0.4, z);
        dummy.scale.setScalar(0.7 + random() * 0.8);
        dummy.updateMatrix();
        instanced.setMatrixAt(placed, dummy.matrix);
        instanced.setColorAt(placed, color.set(tint));
      }
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]}>
      <meshStandardMaterial roughness={0.6} emissive="#331a00" emissiveIntensity={0.2} />
    </instancedMesh>
  );
}

function Trees() {
  const trunkGeometry = useMemo(() => new CylinderGeometry(0.35, 0.55, 5, 7), []);
  const leafGeometry = useMemo(() => new IcosahedronGeometry(2.6, 1), []);
  const trunk = useMemo(() => new MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 }), []);
  const leaves = useMemo(
    () =>
      ['#3f7d2a', '#4f8f2f', '#5d9c35', '#376e25'].map(
        (color) => new MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
      ),
    [],
  );
  const trees = useMemo(() => {
    const random = seededRandom(31);
    const list: {
      x: number;
      z: number;
      s: number;
      leaf: number;
      phase: number;
      blobs: [number, number, number, number][];
    }[] = [];
    while (list.length < 26) {
      const a = random() * Math.PI * 2;
      // Keep the camera's lines of sight (towards ±Z) clear near the table.
      const r = 34 + random() * 70;
      if (r < 50 && Math.abs(Math.cos(a)) < 0.45) continue;
      list.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        s: 0.8 + random() * 0.7,
        leaf: Math.floor(random() * 4),
        phase: random() * 10,
        blobs: Array.from({ length: 3 + Math.floor(random() * 2) }, () => [
          (random() - 0.5) * 2.4,
          5.2 + random() * 2,
          (random() - 0.5) * 2.4,
          0.7 + random() * 0.5,
        ]),
      });
    }
    return list;
  }, []);

  const crowns = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    trees.forEach((tree, i) => {
      const crown = crowns.current[i];
      if (crown) crown.rotation.z = Math.sin(clock.elapsedTime * 0.8 + tree.phase) * 0.025;
    });
  });

  return (
    <group>
      {trees.map((tree, i) => (
        <group
          key={i}
          position={[tree.x, fieldHeight(tree.x, tree.z) - 0.2, tree.z]}
          scale={tree.s}
        >
          <mesh geometry={trunkGeometry} material={trunk} position-y={2.5} castShadow />
          <group
            ref={(g) => {
              crowns.current[i] = g;
            }}
          >
            {tree.blobs.map(([x, y, z, s], j) => (
              <mesh
                key={j}
                geometry={leafGeometry}
                material={leaves[(tree.leaf + j) % leaves.length] ?? trunk}
                position={[x, y, z]}
                scale={s}
                castShadow
              />
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Sunny countryside: rolling meadow, swaying grass, flowers, trees, butterflies and birds. */
export function Field({ quality }: { quality: 'high' | 'low' }) {
  return (
    <group>
      <Meadow />
      <Grass count={quality === 'high' ? 60000 : 16000} />
      <Flowers count={quality === 'high' ? 1400 : 500} />
      <Trees />
      <Clouds count={18} seed={4} />
      <Flock count={7} color="#2b2b33" radius={[30, 80]} height={[22, 40]} size={1.4} seed={8} />
      <Flock
        count={10}
        color="#ffcc33"
        radius={[7, 18]}
        height={[-2.4, -1.2]}
        size={0.22}
        flapSpeed={22}
        seed={12}
      />
    </group>
  );
}
