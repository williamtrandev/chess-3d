'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Color, ConeGeometry, CylinderGeometry, MeshStandardMaterial } from 'three';
import { GROUND_Y, fbm, seededRandom, snowHeight } from '@/lib/scenery';
import { Clouds, Particles, Terrain } from './common';

const ROCK = new Color(0.36, 0.38, 0.42);

function Pines() {
  const geometry = useMemo(
    () => ({
      trunk: new CylinderGeometry(0.25, 0.35, 2, 7),
      // Each layer of needles carries its own snow cap.
      layers: [0, 1, 2].map((i) => ({
        needles: new ConeGeometry(2.4 - i * 0.6, 2.6, 8),
        cap: new ConeGeometry(1.5 - i * 0.38, 1.1, 8),
      })),
    }),
    [],
  );
  const materials = useMemo(
    () => ({
      trunk: new MeshStandardMaterial({ color: '#4a3326', roughness: 1 }),
      needles: new MeshStandardMaterial({ color: '#1d4a37', roughness: 0.9, flatShading: true }),
      snow: new MeshStandardMaterial({ color: '#f8fbff', roughness: 0.8, flatShading: true }),
    }),
    [],
  );
  useEffect(
    () => () => {
      geometry.trunk.dispose();
      geometry.layers.forEach((l) => {
        l.needles.dispose();
        l.cap.dispose();
      });
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometry, materials],
  );
  const pines = useMemo(() => {
    const random = seededRandom(71);
    const list: { x: number; z: number; s: number }[] = [];
    while (list.length < 48) {
      const a = random() * Math.PI * 2;
      const r = 22 + random() * 95;
      if (r < 40 && Math.abs(Math.cos(a)) < 0.45) continue;
      list.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 0.8 + random() * 0.9 });
    }
    return list;
  }, []);

  return (
    <group>
      {pines.map((pine, i) => (
        <group key={i} position={[pine.x, snowHeight(pine.x, pine.z) - 0.2, pine.z]} scale={pine.s}>
          <mesh geometry={geometry.trunk} material={materials.trunk} position-y={1} castShadow />
          {geometry.layers.map((layer, j) => (
            <group key={j} position-y={2.6 + j * 1.5}>
              <mesh geometry={layer.needles} material={materials.needles} castShadow />
              <mesh geometry={layer.cap} material={materials.snow} position-y={0.75} />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Snowy valley under pale winter light: drifts, pines, mountains and falling snow. */
export function Snow({ quality }: { quality: 'high' | 'low' }) {
  const paint = useCallback((x: number, y: number, z: number, color: Color) => {
    const shade = fbm(x * 0.08, z * 0.08, 2);
    color.setRGB(0.88 + shade * 0.1, 0.92 + shade * 0.07, 0.98);
    // Bare rock shows on the high, steep mountain sides.
    const rock = (y - GROUND_Y - 18) / 30 + (fbm(x * 0.05 + 11, z * 0.05, 3) - 0.55) * 2;
    if (rock > 0.2) color.lerp(ROCK, Math.min(1, (rock - 0.2) * 1.6));
  }, []);
  return (
    <group>
      <Terrain size={520} segments={220} height={snowHeight} paint={paint} />
      <Pines />
      <Clouds count={10} seed={6} color="#eef3f8" />
      <Particles
        count={quality === 'high' ? 3500 : 1200}
        color="#ffffff"
        size={0.22}
        radius={60}
        bottom={GROUND_Y}
        top={GROUND_Y + 34}
        mode="fall"
        speed={2.2}
        seed={55}
      />
    </group>
  );
}
