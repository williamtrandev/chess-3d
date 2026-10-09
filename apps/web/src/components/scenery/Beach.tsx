'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  SphereGeometry,
  UniformsLib,
  UniformsUtils,
  Vector3,
  type BufferGeometry,
  type Group,
  type Mesh,
} from 'three';
import { ISLAND_RADIUS, WATER_Y, beachHeight, fbm, seededRandom } from '@/lib/scenery';
import { Clouds, Flock } from './common';

function Sand() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(240, 240, 200, 200);
    g.rotateX(-Math.PI / 2);
    const position = g.attributes.position;
    if (!position) return g;
    const dry = new Color('#e4c88f');
    const warm = new Color('#d6b678');
    const wet = new Color('#c4a874');
    const under = new Color('#8f9c84');
    const c = new Color();
    const colors: number[] = [];
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const y = beachHeight(x, z);
      position.setY(i, y);
      c.copy(dry).lerp(warm, fbm(x * 0.15, z * 0.15, 2));
      const aboveWater = y - WATER_Y;
      if (aboveWater < 0.6) c.lerp(wet, Math.min(1, (0.6 - aboveWater) / 0.6));
      if (aboveWater < -0.4) c.lerp(under, Math.min(1, (-0.4 - aboveWater) / 3));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} />
    </mesh>
  );
}

const WATER_VERTEX = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;
  varying float vWave;
  #include <fog_pars_vertex>
  float wave(vec2 p) {
    return sin(p.x * 0.07 + uTime * 0.9) * 0.32
         + sin(p.y * 0.11 - uTime * 1.15) * 0.22
         + sin((p.x + p.y) * 0.23 + uTime * 1.8) * 0.09;
  }
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float calm = 0.35 + 0.65 * smoothstep(${(ISLAND_RADIUS - 6).toFixed(1)}, ${(ISLAND_RADIUS + 30).toFixed(1)}, length(world.xz));
    vWave = wave(world.xz);
    world.y += vWave * calm;
    vWorld = world.xyz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uShore;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  uniform vec3 uSky;
  uniform vec3 uSunDir;
  varying vec3 vWorld;
  varying float vWave;
  #include <fog_pars_fragment>
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  void main() {
    vec3 normal = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    if (normal.y < 0.0) normal = -normal;
    // Small ripples on top of the big waves.
    normal.xz += (vec2(noise(vWorld.xz * 1.3 + uTime * 0.6), noise(vWorld.zx * 1.1 - uTime * 0.5)) - 0.5) * 0.25;
    normal = normalize(normal);

    float distance = length(vWorld.xz);
    float shallow = 1.0 - smoothstep(uShore, uShore + 32.0, distance);
    vec3 color = mix(uDeep, uShallow, shallow);

    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    color = mix(color, uSky, fresnel * 0.55);
    float sparkle = pow(max(dot(reflect(-uSunDir, normal), viewDir), 0.0), 160.0);
    color += sparkle * 1.6;

    // Foam where the waves wash onto the sand.
    float angle = atan(vWorld.z, vWorld.x);
    float edge = distance - uShore + sin(angle * 7.0 + uTime * 0.7) * 1.4 + sin(uTime * 0.9 + angle * 3.0) * 1.1;
    float band = 1.0 - smoothstep(0.0, 5.5, edge);
    float foam = band * smoothstep(0.42, 0.72, noise(vWorld.xz * 0.9 + uTime * 0.35) + band * 0.35);
    color = mix(color, uFoam, clamp(foam, 0.0, 1.0) * 0.9);
    color += smoothstep(0.38, 0.62, vWave) * 0.05;

    float alpha = mix(0.96, 0.72, shallow);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function Water({ sunDirection }: { sunDirection: Vector3 }) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1400, 1400, 260, 260);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: WATER_VERTEX,
        fragmentShader: WATER_FRAGMENT,
        transparent: true,
        fog: true,
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uShore: { value: ISLAND_RADIUS - 5 },
            uDeep: { value: new Color('#0b5f8a') },
            uShallow: { value: new Color('#3fd0c9') },
            uFoam: { value: new Color('#ffffff') },
            uSky: { value: new Color('#bfe6ff') },
            uSunDir: { value: sunDirection.clone().normalize() },
          },
        ]),
      }),
    [sunDirection],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const mesh = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const uniform = (mesh.current?.material as ShaderMaterial | undefined)?.uniforms.uTime;
    if (uniform) uniform.value = clock.elapsedTime;
  });
  return <mesh ref={mesh} geometry={geometry} material={material} position-y={WATER_Y} />;
}

/** A frond: a strip that narrows and droops towards its tip. Base at the origin, pointing to +X. */
const frondGeometry = (): BufferGeometry => {
  const g = new PlaneGeometry(4.6, 1, 10, 2);
  const position = g.attributes.position;
  if (!position) return g;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) + 2.3; // 0 … 4.6
    const t = x / 4.6;
    const y = position.getY(i);
    position.setXYZ(i, x, -0.18 * x * x + 0.55 * x, y * (1 - t * 0.85) * 0.9);
  }
  g.rotateX(-0.25);
  g.computeVertexNormals();
  return g;
};

const UP = new Vector3(0, 1, 0);

function Palms() {
  const frond = useMemo(() => frondGeometry(), []);
  const segment = useMemo(() => new CylinderGeometry(0.22, 0.28, 1, 8), []);
  const coconut = useMemo(() => new SphereGeometry(0.22, 10, 8), []);
  const bark = useMemo(() => new MeshStandardMaterial({ color: '#8a6640', roughness: 1 }), []);
  const barkDark = useMemo(() => new MeshStandardMaterial({ color: '#6e4f30', roughness: 1 }), []);
  const leaf = useMemo(
    () => new MeshStandardMaterial({ color: '#3e9a3a', roughness: 0.8, side: DoubleSide }),
    [],
  );
  const nut = useMemo(() => new MeshStandardMaterial({ color: '#5a3d20', roughness: 0.7 }), []);

  const palms = useMemo(() => {
    const random = seededRandom(41);
    const list: {
      x: number;
      z: number;
      height: number;
      lean: Vector3;
      phase: number;
      turn: number;
    }[] = [];
    while (list.length < 12) {
      const a = random() * Math.PI * 2;
      const r = 13 + random() * (ISLAND_RADIUS - 20);
      // Leave the views over ±Z (where the players sit) open near the table.
      if (r < 24 && Math.abs(Math.cos(a)) < 0.55) continue;
      list.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        height: 7 + random() * 4,
        lean: new Vector3((random() - 0.5) * 3, 0, (random() - 0.5) * 3).add(
          new Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(1.5),
        ),
        phase: random() * 10,
        turn: random() * Math.PI,
      });
    }
    return list;
  }, []);

  const crowns = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    palms.forEach((palm, i) => {
      const crown = crowns.current[i];
      if (!crown) return;
      const t = clock.elapsedTime;
      crown.rotation.x = Math.sin(t * 1.1 + palm.phase) * 0.05;
      crown.rotation.z = Math.cos(t * 0.9 + palm.phase) * 0.06;
    });
  });

  return (
    <group>
      {palms.map((palm, i) => {
        const base = new Vector3(palm.x, beachHeight(palm.x, palm.z) - 0.2, palm.z);
        const curve = new CatmullRomCurve3([
          new Vector3(0, 0, 0),
          new Vector3(palm.lean.x * 0.15, palm.height * 0.4, palm.lean.z * 0.15),
          new Vector3(palm.lean.x * 0.6, palm.height * 0.8, palm.lean.z * 0.6),
          new Vector3(palm.lean.x, palm.height, palm.lean.z),
        ]);
        const steps = 10;
        const top = curve.getPoint(1);
        return (
          <group key={i} position={base}>
            {Array.from({ length: steps }, (_, s) => {
              const t = (s + 0.5) / steps;
              const p = curve.getPoint(t);
              const tangent = curve.getTangent(t);
              const length = curve.getLength() / steps;
              return (
                <mesh
                  key={s}
                  geometry={segment}
                  material={s % 2 ? bark : barkDark}
                  position={p}
                  quaternion={new Quaternion().setFromUnitVectors(UP, tangent)}
                  scale={[1 - t * 0.3, length * 1.04, 1 - t * 0.3]}
                  castShadow
                />
              );
            })}
            <group
              ref={(g) => {
                crowns.current[i] = g;
              }}
              position={top}
              rotation-y={palm.turn}
            >
              {Array.from({ length: 9 }, (_, f) => (
                <mesh
                  key={f}
                  geometry={frond}
                  material={leaf}
                  rotation={[0, (f / 9) * Math.PI * 2, f % 2 ? 0.15 : -0.05]}
                  castShadow
                />
              ))}
              {[0, 1, 2].map((c) => (
                <mesh
                  key={c}
                  geometry={coconut}
                  material={nut}
                  position={[Math.cos(c * 2.1) * 0.3, -0.3, Math.sin(c * 2.1) * 0.3]}
                />
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}

function Rocks() {
  const geometry = useMemo(() => new DodecahedronGeometry(1, 0), []);
  const rocks = useMemo(() => {
    const random = seededRandom(57);
    return Array.from({ length: 14 }, () => {
      const a = random() * Math.PI * 2;
      const r = ISLAND_RADIUS - 6 + random() * 10;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      return {
        x,
        z,
        y: beachHeight(x, z),
        s: 0.6 + random() * 1.6,
        rx: random() * 3,
        ry: random() * 3,
      };
    });
  }, []);
  return (
    <group>
      {rocks.map((rock, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[rock.x, rock.y, rock.z]}
          rotation={[rock.rx, rock.ry, 0]}
          scale={[rock.s, rock.s * 0.7, rock.s]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#8b8f94" roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Parasol() {
  const x = -9;
  const z = 7;
  const y = beachHeight(x, z);
  return (
    <group position={[x, y, z]} rotation-z={0.12}>
      <mesh position-y={2} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 4, 8]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position-y={4} rotation-y={(i / 8) * Math.PI * 2} castShadow>
          <coneGeometry args={[2.6, 0.9, 2, 1, true, 0, Math.PI / 4]} />
          <meshStandardMaterial color={i % 2 ? '#ffffff' : '#e8463a'} side={DoubleSide} />
        </mesh>
      ))}
      <mesh position={[1.6, 0.03, 0.4]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[1.2, 2.4]} />
        <meshStandardMaterial color="#3aa6e8" />
      </mesh>
    </group>
  );
}

export const BEACH_SUN = new Vector3(-60, 80, -70);

/** Tropical island: sand dunes, animated sea with foam, palms, rocks and seagulls. */
export function Beach({ quality }: { quality: 'high' | 'low' }) {
  return (
    <group>
      <Sand />
      <Water sunDirection={BEACH_SUN} />
      <Palms />
      <Rocks />
      <Parasol />
      <Clouds count={quality === 'high' ? 14 : 8} seed={9} />
      <Flock
        count={9}
        color="#ffffff"
        radius={[25, 70]}
        height={[14, 30]}
        size={1.6}
        flapSpeed={6}
        seed={21}
      />
    </group>
  );
}
