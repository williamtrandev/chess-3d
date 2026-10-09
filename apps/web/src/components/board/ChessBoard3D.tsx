'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
} from 'three';
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

/**
 * The board, pieces and their interaction, to be placed inside a scene. When not
 * interactive (decorative backdrop), the camera slowly circles the board instead.
 */
export function ChessBoard3D({
  theme,
  interactive = true,
}: {
  theme: Theme;
  interactive?: boolean;
}) {
  const store = useGameStoreApi();
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
    if (!interactive) return;
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
        enableRotate={interactive}
        enableZoom={interactive}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minDistance={9}
        maxDistance={30}
        maxPolarAngle={1.4}
        autoRotate={!interactive}
        autoRotateSpeed={0.35}
      />

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
                if (!interactive) return;
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
              interactive={interactive && (canMove || targets.has(piece.square))}
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
