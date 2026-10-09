'use client';

import { Environment, Lightformer, Sky } from '@react-three/drei';
import { Color, Vector3 } from 'three';
import type { Quality } from '@/lib/settings-store';
import { GROUND_Y, type SceneryId } from '@/lib/scenery';
import type { Theme } from '@/lib/themes';
import { BEACH_SUN, Beach } from './Beach';
import { Field } from './Field';

interface Lighting {
  sun: Vector3;
  sunColor: string;
  sunIntensity: number;
  sky: string;
  ground: string;
  hemisphere: number;
  fog: [string, number, number];
  sky3d: { turbidity: number; rayleigh: number; mieCoefficient: number; mieDirectionalG: number };
}

const OUTDOOR: Record<Exclude<SceneryId, 'studio'>, Lighting> = {
  field: {
    sun: new Vector3(70, 55, 40),
    sunColor: '#fff0d4',
    sunIntensity: 2.3,
    sky: '#cfe8ff',
    ground: '#557d34',
    hemisphere: 0.85,
    fog: ['#d6e8f0', 60, 300],
    sky3d: { turbidity: 5, rayleigh: 1.4, mieCoefficient: 0.005, mieDirectionalG: 0.85 },
  },
  beach: {
    sun: BEACH_SUN,
    sunColor: '#fff4e0',
    sunIntensity: 1.7,
    sky: '#bde8ff',
    ground: '#c9b07a',
    hemisphere: 0.6,
    fog: ['#cdeefa', 90, 520],
    sky3d: { turbidity: 2.5, rayleigh: 0.9, mieCoefficient: 0.004, mieDirectionalG: 0.8 },
  },
};

/** Sun light that casts soft shadows around the board and table. */
function Sun({
  direction,
  color,
  intensity,
}: {
  direction: Vector3;
  color: string;
  intensity: number;
}) {
  const position = direction.clone().normalize().multiplyScalar(30);
  return (
    <directionalLight
      castShadow
      position={position}
      color={color}
      intensity={intensity}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-9}
      shadow-camera-right={9}
      shadow-camera-top={9}
      shadow-camera-bottom={-9}
      shadow-camera-near={1}
      shadow-camera-far={80}
    />
  );
}

/** The landscape around the board, with matching sky, light, fog and reflections. */
export function Scenery({ id, quality, theme }: { id: SceneryId; quality: Quality; theme: Theme }) {
  if (id === 'studio') {
    return (
      <>
        <color attach="background" args={[theme.background]} />
        <ambientLight intensity={0.35} />
        <Sun direction={new Vector3(4, 10, 6)} color="#ffffff" intensity={1.8} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={2} position={[0, 6, -6]} scale={[12, 3, 1]} />
          <Lightformer
            form="rect"
            intensity={1.2}
            position={[-6, 4, 2]}
            scale={[3, 8, 1]}
            rotation-y={Math.PI / 2}
          />
          <Lightformer form="ring" intensity={1.5} position={[5, 5, 5]} scale={3} />
        </Environment>
      </>
    );
  }

  const light = OUTDOOR[id];
  return (
    <>
      <color attach="background" args={[new Color(light.fog[0])]} />
      <fog attach="fog" args={[light.fog[0], light.fog[1], light.fog[2]]} />
      <Sky distance={4500} sunPosition={light.sun} {...light.sky3d} />
      <hemisphereLight args={[light.sky, light.ground, light.hemisphere]} />
      <Sun direction={light.sun} color={light.sunColor} intensity={light.sunIntensity} />
      {/* Reflections on the pieces come from the same sky. */}
      <Environment resolution={128} frames={1}>
        <Sky sunPosition={light.sun} {...light.sky3d} />
        <Lightformer form="rect" intensity={1.5} position={[0, 6, -8]} scale={[14, 4, 1]} />
      </Environment>
      {id === 'field' ? <Field quality={quality} /> : <Beach quality={quality} />}
      <Table scenery={id} />
    </>
  );
}

/** Wooden table the board rests on in outdoor scenes. */
function Table({ scenery }: { scenery: Exclude<SceneryId, 'studio'> }) {
  const wood = scenery === 'beach' ? '#d8c4a0' : '#7a5232';
  const top = -0.41 - 0.16;
  const legHeight = top - 0.16 - GROUND_Y;
  return (
    <group>
      <mesh position-y={top} castShadow receiveShadow>
        <boxGeometry args={[10.6, 0.32, 10.6]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {[
        [-4.6, -4.6],
        [4.6, -4.6],
        [-4.6, 4.6],
        [4.6, 4.6],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x ?? 0, top - 0.16 - legHeight / 2, z ?? 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.2, legHeight, 10]} />
          <meshStandardMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
