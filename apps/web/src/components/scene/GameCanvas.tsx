'use client';

import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef } from 'react';
import { Spherical, type PerspectiveCamera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { VIEW_PRESETS, type ViewPreset } from '@/lib/camera-views';
import { GRAPHICS } from '@/lib/graphics';
import { GROUND_Y, PIECE_REFLECTION, TABLE_WOOD, type SceneryId } from '@/lib/scenery';
import { useGraphicsLevel, useSettings } from '@/lib/settings-store';
import type { Theme } from '@/lib/themes';
import { ChessBoard3D } from '../board/ChessBoard3D';
import { CharacterOutlines } from '../characters/Character';
import { Players } from '../characters/Players';
import { useGame } from '../game/game-context';
import { SCENE_BLOOM, Scenery } from '../scenery/Scenery';
import { Table } from './Table';

/**
 * Where the HTML overlay sits, so the board can be framed in the free space next to it:
 * `game` has the side panel on the right, `full` has it hidden, `home` has text on the left.
 */
export type CanvasLayout = 'game' | 'full' | 'home';

interface Props {
  theme: Theme;
  scenery: SceneryId;
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

export default function GameCanvas({ theme, scenery, showBoard, interactive, layout }: Props) {
  const declineGraphics = useSettings((s) => s.declineGraphics);
  const graphics = GRAPHICS[useGraphicsLevel()];
  const showPlayers = useSettings((s) => s.showPlayers);
  const preset = usePreset(layout);
  const outdoor = scenery !== 'studio';

  return (
    <Canvas
      shadows={graphics.shadows}
      dpr={graphics.dpr}
      // Frames are driven by FrameLimiter, so the scene never renders faster than needed.
      frameloop="never"
      camera={{ fov: 50, near: 0.1, far: 3000, position: [0, 8, 14] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      aria-label={showBoard ? 'Bàn cờ 3D' : 'Khung cảnh'}
    >
      <FrameLimiter fps={graphics.fps} />
      <PerformanceMonitor
        bounds={() => [graphics.fps * 0.75, graphics.fps + 1]}
        onDecline={declineGraphics}
      />
      <Scenery
        id={scenery}
        quality={graphics.scenery}
        shadowMapSize={graphics.shadowMapSize}
        theme={theme}
      />
      {!outdoor && (
        <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
          <circleGeometry args={[30, 64]} />
          <meshStandardMaterial color="#14161c" roughness={0.9} />
        </mesh>
      )}
      <Table wood={TABLE_WOOD[scenery]} />
      {showPlayers && (
        <CharacterOutlines value={graphics.characterOutlines}>
          <Players occlusion={preset.ownAvatar} wood={TABLE_WOOD[scenery]} />
        </CharacterOutlines>
      )}
      {showBoard ? (
        <ChessBoard3D
          theme={theme}
          interactive={interactive}
          autoRotate={preset.autoRotate}
          reflection={PIECE_REFLECTION[scenery]}
        />
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
      {graphics.postprocessing && (
        <EffectComposer multisampling={graphics.multisampling}>
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
 * Renders the scene at a fixed rate instead of the display's refresh rate: a 120 Hz
 * screen would otherwise render (and heat the device) twice as often for no visible gain.
 */
function FrameLimiter({ fps }: { fps: number }) {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    const interval = 1000 / fps;
    let last = 0;
    let id = 0;
    const loop = (now: number) => {
      id = requestAnimationFrame(loop);
      // A little slack so a 60 Hz display reaching 59.9 frames still hits a 60 fps target;
      // stepping `last` by the interval keeps the average on target between vsync ticks.
      if (now - last >= interval - 2) {
        last = Math.max(last + interval, now - interval);
        // r3f's clock runs in seconds; rAF timestamps are milliseconds.
        advance(now / 1000);
      }
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [fps, advance]);
  return null;
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
    const panel = !desktop ? 0 : { game: 380, full: 0, home: -Math.min(620, width * 0.45) }[layout];
    const lift = desktop ? preset.lift : preset.lift * 0.5;
    const freeAspect = (width - Math.abs(panel)) / Math.max(1, height);
    const scale = Math.max(1, (1.18 / freeAspect) ** 0.75);
    return { panel, lift, scale };
  }, [width, height, layout, preset.lift]);

  // Slide the framing when the panel shows or hides, instead of jumping.
  const offset = useRef<{ x: number; y: number } | null>(null);
  useFrame((_, delta) => {
    const target = { x: framing.panel / 2, y: -framing.lift * height };
    const k = offset.current ? 1 - Math.exp(-delta * 6) : 1;
    const current = offset.current ?? target;
    offset.current = {
      x: current.x + (target.x - current.x) * k,
      y: current.y + (target.y - current.y) * k,
    };
    camera.setViewOffset(width, height, offset.current.x, offset.current.y, width, height);
    camera.updateProjectionMatrix();
  });

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
