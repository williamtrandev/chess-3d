'use client';

import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Vector3, type PointLight } from 'three';
import { GROUND_Y, fieldHeight } from '@/lib/scenery';
import { Particles } from './common';

export const MOON = new Vector3(-90, 95, -170);

const LANTERNS = [0.6, 2.2, 3.8, 5.4].map((a) => [Math.cos(a) * 13, Math.sin(a) * 13] as const);

function Lantern({ x, z, index }: { x: number; z: number; index: number }) {
  const light = useRef<PointLight>(null);
  useFrame(({ clock }) => {
    if (light.current)
      light.current.intensity = 55 + Math.sin(clock.elapsedTime * 7 + index * 3) * 6;
  });
  const y = fieldHeight(x, z);
  return (
    <group position={[x, y, z]}>
      <mesh position-y={2.2} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 4.4, 8]} />
        <meshStandardMaterial color="#2a1d14" roughness={0.8} />
      </mesh>
      <mesh position={[0.7, 4.2, 0]}>
        <boxGeometry args={[1.4, 0.08, 0.08]} />
        <meshStandardMaterial color="#2a1d14" />
      </mesh>
      <mesh position={[1.3, 3.55, 0]} scale={[1, 1.25, 1]}>
        <sphereGeometry args={[0.45, 20, 14]} />
        <meshStandardMaterial
          color="#ff8a3d"
          emissive="#ff7a2a"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        ref={light}
        position={[1.3, 3.5, 0]}
        color="#ffae5c"
        intensity={55}
        distance={30}
        decay={2}
      />
    </group>
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
      {LANTERNS.map(([x, z], i) => (
        <Lantern key={i} x={x} z={z} index={i} />
      ))}
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
