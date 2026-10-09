'use client';

import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo } from 'react';
import { Vector3 } from 'three';
import type { Avatar } from '@/lib/avatar';
import { Character, type Activity } from './Character';

/** Turntable preview of a character on its chair, for the character editor. */
export default function AvatarPreview({
  avatar,
  activity,
}: {
  avatar: Avatar;
  activity: Activity;
}) {
  const focus = useMemo(() => new Vector3(0, 1.4, -3), []);
  return (
    <Canvas
      shadows
      camera={{ position: [4.6, 4.4, -7.6], fov: 32 }}
      aria-label="Xem trước nhân vật"
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[3, 6, -4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={2} position={[0, 4, -6]} scale={[8, 3, 1]} />
        <Lightformer
          form="rect"
          intensity={1}
          position={[-5, 3, 0]}
          scale={[2, 6, 1]}
          rotation-y={Math.PI / 2}
        />
      </Environment>
      <group position={[0, 1.65, 0]}>
        <Character
          avatar={avatar}
          activity={activity}
          focus={focus}
          reach={null}
          occlusion="show"
          wood="#8a5a35"
        />
      </group>
      {/* A small table in front, so the hands have something to rest on. */}
      <group position={[0, 0, -2.45]}>
        <mesh position-y={2.86} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.14, 2]} />
          <meshStandardMaterial color="#8a5a35" roughness={0.7} />
        </mesh>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} position={[x, 1.4, -0.7]} castShadow>
            <cylinderGeometry args={[0.08, 0.07, 2.8, 8]} />
            <meshStandardMaterial color="#8a5a35" roughness={0.7} />
          </mesh>
        ))}
      </group>
      <ContactShadows position={[0, 0.001, 0]} opacity={0.5} scale={6} blur={2.4} far={3} />
      <OrbitControls
        makeDefault
        target={[0, 2.7, -0.8]}
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        maxPolarAngle={1.5}
        autoRotate
        autoRotateSpeed={0.8}
      />
    </Canvas>
  );
}
