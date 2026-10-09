'use client';

import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import { Spherical, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { VIEW_PRESETS, type ViewPreset } from '@/lib/camera-views';
import { GROUND_Y, TABLE_WOOD, type SceneryId } from '@/lib/scenery';
import { useSettings, type Quality } from '@/lib/settings-store';
import type { Theme } from '@/lib/themes';
import { ChessBoard3D } from '../board/ChessBoard3D';
import { Players } from '../characters/Players';
import { useGame } from '../game/game-context';
import { SCENE_BLOOM, Scenery } from '../scenery/Scenery';
import { Table } from './Table';

/** Where the HTML overlay sits, so the board can be framed in the free space next to it. */
export type CanvasLayout = 'game' | 'home';

interface Props {
  theme: Theme;
  scenery: SceneryId;
  quality: Quality;
  /** Draw the 3D board (false when the 2D board is shown over the scenery). */
  showBoard: boolean;
  interactive: boolean;
  layout: CanvasLayout;
}

/** Slow orbit used behind the menu pages. */
const HOME_PRESET: ViewPreset = {
  radius: 24,
  phi: 1.12,
  theta: 0.5,
  lift: 0.1,
  autoRotate: true,
  ownAvatar: 'show',
};

const usePreset = (layout: CanvasLayout): ViewPreset => {
  const view = useSettings((s) => s.cameraView);
  // Fall back if storage holds a view this version does not know.
  return layout === 'home' ? HOME_PRESET : (VIEW_PRESETS[view] ?? VIEW_PRESETS.player);
};

export default function GameCanvas({
  theme,
  scenery,
  quality,
  showBoard,
  interactive,
  layout,
}: Props) {
  const setQuality = useSettings((s) => s.setQuality);
  const showPlayers = useSettings((s) => s.showPlayers);
  const preset = usePreset(layout);
  const outdoor = scenery !== 'studio';

  return (
    <Canvas
      shadows="soft"
      dpr={quality === 'high' ? [1, 1.75] : 1}
      camera={{ fov: 50, near: 0.1, far: 3000, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label={showBoard ? 'Bàn cờ 3D' : 'Khung cảnh'}
    >
      <PerformanceMonitor onDecline={() => setQuality('low')} />
      <Scenery id={scenery} quality={quality} theme={theme} />
      {!outdoor && (
        <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
          <circleGeometry args={[30, 64]} />
          <meshStandardMaterial color="#14161c" roughness={0.9} />
        </mesh>
      )}
      <Table wood={TABLE_WOOD[scenery]} />
      {showPlayers && <Players occlusion={preset.ownAvatar} wood={TABLE_WOOD[scenery]} />}
      {showBoard ? (
        <ChessBoard3D theme={theme} interactive={interactive} autoRotate={preset.autoRotate} />
      ) : (
        <OrbitControls
          makeDefault
          enableRotate={false}
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.25}
        />
      )}
      <CameraRig preset={preset} layout={layout} />
      {quality === 'high' && (
        <EffectComposer>
          <Bloom
            mipmapBlur
            intensity={theme.bloom * SCENE_BLOOM[scenery].intensity}
            luminanceThreshold={SCENE_BLOOM[scenery].threshold}
          />
          <Vignette offset={0.25} darkness={outdoor ? 0.45 : 0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

/**
 * Frames the board in the space left free by the HTML panels, and smoothly moves the
 * camera to the chosen view from the player's side whenever either changes.
 */
function CameraRig({ preset, layout }: { preset: ViewPreset; layout: CanvasLayout }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const { width, height } = useThree((s) => s.size);
  const orientation = useGame((s) => s.orientation);
  const goal = useRef<Spherical | null>(null);

  const framing = useMemo(() => {
    const desktop = width >= 1024;
    // Positive: panel on the right (board shifts left); negative: panel on the left.
    const panel = !desktop ? 0 : layout === 'game' ? 380 : -Math.min(620, width * 0.45);
    const lift = desktop ? preset.lift : preset.lift * 0.5;
    const freeAspect = (width - Math.abs(panel)) / Math.max(1, height);
    const scale = Math.max(1, (1.18 / freeAspect) ** 0.75);
    return { panel, lift, scale };
  }, [width, height, layout, preset.lift]);

  useEffect(() => {
    camera.setViewOffset(width, height, framing.panel / 2, -framing.lift * height, width, height);
    camera.updateProjectionMatrix();
  }, [camera, width, height, framing]);

  useEffect(() => {
    goal.current = new Spherical(
      preset.radius * framing.scale,
      preset.phi,
      (orientation === 'white' ? 0 : Math.PI) + preset.theta,
    );
  }, [orientation, preset, framing.scale]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      goal.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useFrame((_, delta) => {
    const g = goal.current;
    if (!g) return;
    const current = new Spherical().setFromVector3(camera.position);
    const k = 1 - Math.exp(-delta * 3.5);
    const dTheta = Math.atan2(Math.sin(g.theta - current.theta), Math.cos(g.theta - current.theta));
    current.radius += (g.radius - current.radius) * k;
    current.phi += (g.phi - current.phi) * k;
    current.theta += dTheta * k;
    camera.position.setFromSpherical(current);
    camera.lookAt(0, 0, 0);
    controls?.update();
    if (
      Math.abs(dTheta) < 0.001 &&
      Math.abs(g.phi - current.phi) < 0.001 &&
      Math.abs(g.radius - current.radius) < 0.01
    ) {
      goal.current = null;
    }
  });

  return null;
}
