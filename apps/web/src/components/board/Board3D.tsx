'use client';

import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  MeshStandardMaterial,
  Spherical,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Color } from '@chess3d/chess-core';
import {
  SQUARES,
  isLightSquare,
  pieceAt,
  piecesFromFen,
  squareCoords,
  type BoardPiece,
} from '@/lib/board';
import type { Theme, PieceMaterial } from '@/lib/themes';
import { useGame, useGameStoreApi } from '../game/game-context';
import { useBoardState } from './board-state';
import { createPieceGeometries } from './piece-geometry';

const MOVE_DURATION = 0.32;
const CAPTURE_DURATION = 0.8;

/** World position of a square's center on the board surface (white at +Z). */
const squareToVector = (square: string, y = 0): Vector3 => {
  const { file, rank } = squareCoords(square);
  return new Vector3(file - 3.5, y, 3.5 - rank);
};

const vectorToSquare = (point: Vector3): string | null => {
  const file = Math.floor(point.x + 4);
  const rank = Math.floor(4 - point.z);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${'abcdefgh'[file]}${rank + 1}`;
};

const toMaterial = (m: PieceMaterial) =>
  new MeshStandardMaterial({
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
    ...(m.emissive ? { emissive: m.emissive, emissiveIntensity: m.emissiveIntensity ?? 0 } : {}),
  });

interface DragState {
  square: string;
  point: Vector3;
}

export default function Board3D({ theme, topDown }: { theme: Theme; topDown: boolean }) {
  const [effects, setEffects] = useState(true);
  const [dpr, setDpr] = useState(1.5);

  return (
    <Canvas
      shadows="soft"
      dpr={dpr}
      camera={{ fov: 42, position: [0, 13, 9.3] }}
      aria-label="Bàn cờ 3D"
    >
      <color attach="background" args={[theme.background]} />
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1);
          setEffects(false);
        }}
      />
      <ambientLight intensity={0.35} />
      <directionalLight
        castShadow
        position={[4, 10, 6]}
        intensity={1.8}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
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
      <Scene theme={theme} topDown={topDown} />
      {effects && (
        <EffectComposer>
          <Bloom mipmapBlur intensity={theme.bloom} luminanceThreshold={0.75} />
        </EffectComposer>
      )}
    </Canvas>
  );
}

function Scene({ theme, topDown }: { theme: Theme; topDown: boolean }) {
  const store = useGameStoreApi();
  const orientation = useGame((s) => s.orientation);
  const outcome = useGame((s) => s.outcome);
  const { pieces, selected, targets, lastMove, checkSquare, canMove } = useBoardState();
  const moves = useGame((s) => s.moves);
  const startFen = useGame((s) => s.startFen);

  const geometries = useMemo(() => createPieceGeometries(), []);
  const materials = useMemo(
    () => ({ white: toMaterial(theme.white), black: toMaterial(theme.black) }),
    [theme],
  );
  useEffect(() => {
    return () => Object.values(geometries).forEach((g) => g.dispose());
  }, [geometries]);
  useEffect(() => {
    return () => Object.values(materials).forEach((m) => m.dispose());
  }, [materials]);

  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const wasSelected = useRef(false);

  const ply = moves.length;
  const animation = useMemo(() => moveAnimation(moves.at(-1)), [moves]);
  const captured = useMemo(() => {
    const last = moves.at(-1);
    if (!last?.captured) return null;
    const before = piecesFromFen(moves.at(-2)?.fenAfter ?? startFen);
    return pieceAt(before, last.to) ?? pieceAt(before, `${last.to[0]}${last.from[1]}`) ?? null;
  }, [moves, startFen]);

  const shake = useRef(0);
  useEffect(() => {
    if (outcome?.reason === 'checkmate') shake.current = 0.6;
  }, [outcome]);
  const boardGroup = useRef<Group>(null);
  useFrame((_, delta) => {
    const group = boardGroup.current;
    if (!group) return;
    if (shake.current > 0) {
      shake.current = Math.max(0, shake.current - delta);
      const amount = 0.06 * shake.current;
      group.position.set((Math.random() - 0.5) * amount, 0, (Math.random() - 0.5) * amount);
    } else if (group.position.lengthSq() > 0) {
      group.position.set(0, 0, 0);
    }
  });

  const onPiecePointerDown = (event: ThreeEvent<PointerEvent>, piece: BoardPiece) => {
    event.stopPropagation();
    const state = store.getState();
    wasSelected.current = state.selected === piece.square;
    if (!wasSelected.current) state.select(piece.square);
    const after = store.getState();
    if (after.selected === piece.square && after.canPlayerMove()) {
      drag.current = { square: piece.square, point: squareToVector(piece.square) };
      setDragging(true);
    }
  };

  const endDrag = (point: Vector3 | null) => {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (!current) return;
    const target = point ? vectorToSquare(point) : null;
    const state = store.getState();
    if (target && target !== current.square) state.tryMove(current.square, target);
    else if (target === current.square && wasSelected.current) state.select(current.square);
  };

  useEffect(() => {
    if (!dragging) return;
    const cancel = () => endDrag(null);
    window.addEventListener('pointerup', cancel);
    return () => window.removeEventListener('pointerup', cancel);
  });

  return (
    <>
      <OrbitControls
        makeDefault
        enabled={!dragging}
        enablePan={false}
        minDistance={8}
        maxDistance={22}
        maxPolarAngle={1.25}
      />
      <CameraRig orientation={orientation} topDown={topDown} />

      <group ref={boardGroup}>
        <mesh position={[0, -0.21, 0]} receiveShadow castShadow>
          <boxGeometry args={[9.1, 0.4, 9.1]} />
          <meshStandardMaterial color={theme.frame} roughness={0.6} />
        </mesh>

        {SQUARES.map((square) => {
          const position = squareToVector(square, 0);
          return (
            <mesh
              key={square}
              position={position}
              rotation-x={-Math.PI / 2}
              receiveShadow
              onPointerDown={(e) => {
                e.stopPropagation();
                store.getState().select(square);
              }}
            >
              <planeGeometry args={[1, 1]} />
              <meshStandardMaterial
                color={isLightSquare(square) ? theme.lightSquare : theme.darkSquare}
                roughness={theme.id === 'marble' ? 0.2 : 0.7}
                metalness={theme.id === 'neon' ? 0.3 : 0}
              />
            </mesh>
          );
        })}

        <Highlights
          selected={selected}
          targets={targets}
          lastMove={lastMove}
          checkSquare={checkSquare}
          occupied={new Set(pieces.map((p) => p.square))}
        />

        {pieces.map((piece) => {
          const from = animation.get(piece.square);
          return (
            <Piece
              key={from ? `${piece.square}@${ply}` : piece.square}
              piece={piece}
              from={from}
              geometry={geometries[piece.type]}
              material={materials[piece.color]}
              lifted={piece.square === selected}
              drag={drag}
              interactive={canMove || targets.has(piece.square)}
              onPointerDown={onPiecePointerDown}
            />
          );
        })}

        {captured && (
          <CapturedPiece
            key={`captured@${ply}`}
            piece={captured}
            geometry={geometries[captured.type]}
            material={materials[captured.color]}
          />
        )}

        {/* Invisible catcher for drag movement and drops. */}
        <mesh
          rotation-x={-Math.PI / 2}
          position={[0, 0.002, 0]}
          visible={dragging}
          onPointerMove={(e) => {
            if (drag.current) drag.current.point.copy(e.point);
          }}
          onPointerUp={(e) => {
            if (!drag.current) return;
            e.stopPropagation();
            endDrag(e.point);
          }}
        >
          <planeGeometry args={[40, 40]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </>
  );
}

/** Which squares should animate in from where, for the last move (including the castling rook). */
const moveAnimation = (
  last: { from: string; to: string; san: string } | undefined,
): Map<string, string> => {
  const sources = new Map<string, string>();
  if (!last) return sources;
  sources.set(last.to, last.from);
  if (last.san.startsWith('O-O')) {
    const rank = last.from[1];
    const queenSide = last.san.startsWith('O-O-O');
    sources.set(`${queenSide ? 'd' : 'f'}${rank}`, `${queenSide ? 'a' : 'h'}${rank}`);
  }
  return sources;
};

/**
 * Knights look towards the centre files and slightly towards the opponent, so their
 * silhouette stays readable from the player's seat. The head's muzzle points to +X.
 */
const knightRotation = (piece: BoardPiece): number => {
  const towardsRight = squareCoords(piece.square).file < 4;
  const tilt = Math.PI / 6;
  if (piece.color === 'white') return towardsRight ? tilt : Math.PI - tilt;
  return towardsRight ? -tilt : Math.PI + tilt;
};

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

interface PieceProps {
  piece: BoardPiece;
  from: string | undefined;
  geometry: BufferGeometry;
  material: Material;
  lifted: boolean;
  drag: RefObject<DragState | null>;
  interactive: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>, piece: BoardPiece) => void;
}

function Piece({
  piece,
  from,
  geometry,
  material,
  lifted,
  drag,
  interactive,
  onPointerDown,
}: PieceProps) {
  const ref = useRef<Group>(null);
  const target = useMemo(() => squareToVector(piece.square), [piece.square]);
  const start = useMemo(() => (from ? squareToVector(from) : null), [from]);
  const elapsed = useRef(start ? 0 : MOVE_DURATION);
  const setCursor = (value: string) => {
    if (interactive) document.body.style.cursor = value;
  };

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group) return;
    const dragged = drag.current?.square === piece.square ? drag.current : null;
    if (dragged) {
      group.position.lerp(new Vector3(dragged.point.x, 0.35, dragged.point.z), 0.5);
      return;
    }
    if (start && elapsed.current < MOVE_DURATION) {
      elapsed.current = Math.min(MOVE_DURATION, elapsed.current + delta);
      const t = easeInOut(elapsed.current / MOVE_DURATION);
      group.position.lerpVectors(start, target, t);
      group.position.y = Math.sin(Math.PI * t) * 0.6;
      return;
    }
    const y = lifted ? 0.12 : 0;
    group.position.set(target.x, group.position.y + (y - group.position.y) * 0.25, target.z);
  });

  return (
    <group
      ref={ref}
      position={start ?? target}
      rotation-y={piece.type === 'n' ? knightRotation(piece) : 0}
      onPointerDown={(e) => onPointerDown(e, piece)}
      onPointerOver={() => setCursor('grab')}
      onPointerOut={() => setCursor('auto')}
    >
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
    </group>
  );
}

/** A captured piece flies up and off the board, shrinking as it goes. */
function CapturedPiece({
  piece,
  geometry,
  material,
}: {
  piece: BoardPiece;
  geometry: BufferGeometry;
  material: Material;
}) {
  const ref = useRef<Group>(null);
  const elapsed = useRef(0);
  const origin = useMemo(() => squareToVector(piece.square), [piece.square]);
  const direction = piece.color === 'white' ? 1 : -1;

  useFrame((_, delta) => {
    const group = ref.current;
    if (!group || elapsed.current >= CAPTURE_DURATION) return;
    elapsed.current = Math.min(CAPTURE_DURATION, elapsed.current + delta);
    const t = elapsed.current / CAPTURE_DURATION;
    group.position.set(
      origin.x + direction * t * 6,
      Math.sin(Math.PI * t) * 2.5,
      origin.z + direction * t * 1.5,
    );
    group.rotation.z = direction * t * Math.PI * 2;
    group.scale.setScalar(1 - t);
    group.visible = t < 1;
  });

  return (
    <group ref={ref} position={origin}>
      <mesh geometry={geometry} material={material} castShadow />
    </group>
  );
}

interface HighlightsProps {
  selected: string | null;
  targets: ReadonlySet<string>;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  occupied: ReadonlySet<string>;
}

function Highlights({ selected, targets, lastMove, checkSquare, occupied }: HighlightsProps) {
  const tiles: { square: string; color: string; opacity: number }[] = [];
  if (lastMove) {
    tiles.push({ square: lastMove.from, color: '#f6e05e', opacity: 0.3 });
    tiles.push({ square: lastMove.to, color: '#f6e05e', opacity: 0.4 });
  }
  if (selected) tiles.push({ square: selected, color: '#63b3ed', opacity: 0.5 });

  return (
    <group>
      {tiles.map(({ square, color, opacity }) => (
        <mesh
          key={`${square}-${color}-${opacity}`}
          position={squareToVector(square, 0.003)}
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
      ))}
      {[...targets].map((square) => (
        <mesh
          key={`t-${square}`}
          position={squareToVector(square, 0.006)}
          rotation-x={-Math.PI / 2}
        >
          {occupied.has(square) ? (
            <ringGeometry args={[0.38, 0.47, 40]} />
          ) : (
            <circleGeometry args={[0.14, 32]} />
          )}
          <meshBasicMaterial color="#1a202c" transparent opacity={0.45} depthWrite={false} />
        </mesh>
      ))}
      {checkSquare && (
        <mesh position={squareToVector(checkSquare, 0.008)} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.48, 40]} />
          <meshBasicMaterial
            color={[3, 0.2, 0.2]}
            transparent
            opacity={0.7}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Smoothly moves the camera to the player's side, or to a top-down view. */
function CameraRig({ orientation, topDown }: { orientation: Color; topDown: boolean }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const goal = useRef<Spherical | null>(null);

  useEffect(() => {
    goal.current = new Spherical(
      16,
      topDown ? 0.0001 : 0.62,
      orientation === 'white' ? 0 : Math.PI,
    );
  }, [orientation, topDown]);

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
    const k = 1 - Math.exp(-delta * 6);
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
