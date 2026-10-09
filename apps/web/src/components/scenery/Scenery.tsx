'use client';

import { Environment, Lightformer, Sky } from '@react-three/drei';
import { Vector3 } from 'three';
import type { SceneryId } from '@/lib/scenery';
import type { Quality } from '@/lib/settings-store';
import type { Theme } from '@/lib/themes';
import { BEACH_SUN, Beach } from './Beach';
import { Field } from './Field';
import { MOON, NightExtras, SunsetMotes } from './Night';
import { Sakura } from './Sakura';
import { Snow } from './Snow';

type Outdoor = Exclude<SceneryId, 'studio'>;

interface Lighting {
  /** Direction of the sun (or moon) light. */
  sun: Vector3;
  sunColor: string;
  sunIntensity: number;
  sky: string;
  ground: string;
  hemisphere: number;
  fog: [color: string, near: number, far: number];
  /** Physical sky parameters; null for a night sky. */
  sky3d: {
    turbidity: number;
    rayleigh: number;
    mieCoefficient: number;
    mieDirectionalG: number;
  } | null;
}

const LIGHTING: Record<Outdoor, Lighting> = {
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
  sunset: {
    sun: new Vector3(130, 9, -60),
    sunColor: '#ffad66',
    sunIntensity: 2.4,
    sky: '#ffcfa3',
    ground: '#4c3a1e',
    hemisphere: 0.55,
    fog: ['#eeb58e', 50, 290],
    sky3d: { turbidity: 8, rayleigh: 3, mieCoefficient: 0.008, mieDirectionalG: 0.92 },
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
  snow: {
    sun: new Vector3(50, 32, -70),
    sunColor: '#eaf2ff',
    sunIntensity: 1.5,
    sky: '#dce9ff',
    ground: '#f2f6fb',
    hemisphere: 0.7,
    fog: ['#dfe7ef', 40, 270],
    sky3d: { turbidity: 1.6, rayleigh: 0.45, mieCoefficient: 0.003, mieDirectionalG: 0.75 },
  },
  night: {
    sun: MOON,
    sunColor: '#9fb6ff',
    sunIntensity: 0.9,
    sky: '#2a3a66',
    ground: '#0b1a12',
    hemisphere: 0.45,
    fog: ['#0a1330', 30, 210],
    sky3d: null,
  },
  sakura: {
    sun: new Vector3(55, 60, 45),
    sunColor: '#fff0e6',
    sunIntensity: 2,
    sky: '#ffe4ee',
    ground: '#5f7f43',
    hemisphere: 0.75,
    fog: ['#f3e5ea', 60, 280],
    sky3d: { turbidity: 4, rayleigh: 1.2, mieCoefficient: 0.005, mieDirectionalG: 0.85 },
  },
};

/** Bloom settings per scene: night scenes let lanterns and fireflies glow. */
export const SCENE_BLOOM: Record<SceneryId, { threshold: number; intensity: number }> = {
  field: { threshold: 0.95, intensity: 0.5 },
  sunset: { threshold: 0.9, intensity: 0.6 },
  beach: { threshold: 0.95, intensity: 0.5 },
  snow: { threshold: 0.97, intensity: 0.4 },
  night: { threshold: 0.55, intensity: 1.2 },
  sakura: { threshold: 0.95, intensity: 0.5 },
  studio: { threshold: 0.75, intensity: 1 },
};

/** Sun light that casts soft shadows around the table and the players. */
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
      shadow-camera-left={-13}
      shadow-camera-right={13}
      shadow-camera-top={13}
      shadow-camera-bottom={-13}
      shadow-camera-near={1}
      shadow-camera-far={80}
    />
  );
}

function Landscape({ id, quality }: { id: Outdoor; quality: Quality }) {
  switch (id) {
    case 'field':
      return <Field quality={quality} />;
    case 'sunset':
      return (
        <>
          <Field quality={quality} variant="sunset" />
          <SunsetMotes quality={quality} />
        </>
      );
    case 'night':
      return (
        <>
          <Field quality={quality} variant="night" />
          <NightExtras quality={quality} />
        </>
      );
    case 'beach':
      return <Beach quality={quality} />;
    case 'snow':
      return <Snow quality={quality} />;
    case 'sakura':
      return <Sakura quality={quality} />;
  }
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

  const light = LIGHTING[id];
  return (
    <>
      <color attach="background" args={[light.fog[0]]} />
      <fog attach="fog" args={light.fog} />
      {light.sky3d && <Sky distance={4500} sunPosition={light.sun} {...light.sky3d} />}
      <hemisphereLight args={[light.sky, light.ground, light.hemisphere]} />
      <Sun direction={light.sun} color={light.sunColor} intensity={light.sunIntensity} />
      {/* Reflections on the pieces come from the same sky. */}
      <Environment resolution={128} frames={1}>
        {light.sky3d ? (
          <Sky sunPosition={light.sun} {...light.sky3d} />
        ) : (
          <color attach="background" args={['#101a3a']} />
        )}
        <Lightformer
          form="rect"
          intensity={light.sky3d ? 1.5 : 0.6}
          position={[0, 6, -8]}
          scale={[14, 4, 1]}
        />
      </Environment>
      <Landscape id={id} quality={quality} />
    </>
  );
}
