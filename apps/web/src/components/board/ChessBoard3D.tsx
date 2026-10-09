'use client';

import { OrbitControls } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  Euler,
  MeshStandardMaterial,
  MeshToonMaterial,
  Quaternion,
  PlaneGeometry,
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
  type BoardPiece,
  type PieceType,
} from '@/lib/board';
import type { Theme, PieceMaterial } from '@/lib/themes';
import { useGame, useGameStoreApi } from '../game/game-context';
import { bake, place } from '@/lib/bake';
import {
  APPROACH,
  ATTACK_TIME,
  SETTLE,
  STRIKE,
  attackDirection,
  attackPose,
  effectSpeed,
} from '@/lib/capture-fx';
import { useSettings } from '@/lib/settings-store';
import { toonRamp } from '@/lib/toon';
import { squareToVector, vectorToSquare } from '@/lib/board-space';
import { useBoardState } from './board-state';
import { createPieceGeometries } from './piece-geometry';
import { SlicedPiece } from './CaptureFx';
import { PieceOutline } from './PieceOutline';
import { figureFor, figureRestYaw, figureYawTowards, type Figure } from './figures';
import { knightRotation } from './piece-orientation';

const MOVE_DURATION = 0.32;
const CAPTURE_DURATION = 0.8;
const UP = new Vector3(0, 1, 0);
/** Width of the contrasting silhouette around pieces, in drawing-buffer pixels. */
/**
 * Outline width in world units, so it scales with the piece on screen: a fixed pixel
 * width swamped small, distant pieces (top view, phones).
 */
const PIECE_OUTLINE = 0.016;

const toMaterial = (m: PieceMaterial, reflection: number) =>
  new MeshStandardMaterial({
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
    envMapIntensity: reflection,
    ...(m.emissive ? { emissive: m.emissive, emissiveIntensity: m.emissiveIntensity ?? 0 } : {}),
  });

interface DragState {
  square: string;
  point: Vector3;
  /** Screen position where the press started, to tell a click from a drag. */
  screen: { x: number; y: number };
}

/** Pointer travel (CSS pixels) below which a press and release count as a click. */
const CLICK_SLOP = 6;

/**
 * The board, pieces and their interaction, to be placed inside a scene. When not
 * interactive (decorative backdrop), the camera slowly circles the board instead.
 */
export function ChessBoard3D({
  theme,
  interactive = true,
  autoRotate = false,
  reflection = 1,
}: {
  theme: Theme;
  interactive?: boolean;
  autoRotate?: boolean;
  /** Strength of environment reflections on the pieces (lower in bright scenes). */
  reflection?: number;
}) {
  const store = useGameStoreApi();
  const outcome = useGame((s) => s.outcome);
  const { pieces, selected, targets, lastMove, checkSquare, canMove } = useBoardState();
  const moves = useGame((s) => s.moves);
  const startFen = useGame((s) => s.startFen);

  const geometries = useMemo(() => createPieceGeometries(), []);
  const squareGeometry = useMemo(() => {
    const tile = new PlaneGeometry(1, 1);
    const flat = new Euler(-Math.PI / 2, 0, 0);
    const shade = (light: boolean) =>
      bake(
        SQUARES.filter((square) => isLightSquare(square) === light).map((square) => ({
          geometry: tile,
          matrix: place(squareToVector(square, 0), flat),
        })),
      );
    const baked = { light: shade(true), dark: shade(false) };
    tile.dispose();
    return baked;
  }, []);
  useEffect(
    () => () => Object.values(squareGeometry).forEach((g) => g.dispose()),
    [squareGeometry],
  );
  const figures = theme.figures === true;
  const materials = useMemo(() => {
    if (figures) {
      // Figures carry their colours per vertex, so both sides share one toon material.
      const toon = new MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
      return { white: toon, black: toon };
    }
    return {
      white: toMaterial(theme.white, reflection),
      black: toMaterial(theme.black, reflection),
    };
  }, [theme, reflection, figures]);
  /** Rest turn of a piece: figures face the opponent, knights look towards the centre. */
  const restYaw = (piece: BoardPiece) =>
    figures ? figureRestYaw(piece.color) : piece.type === 'n' ? knightRotation(piece) : 0;
  const figureOf = (piece: BoardPiece) => (figures ? figureFor(piece.type, piece.color) : null);
  useEffect(() => {
    return () => Object.values(geometries).forEach((g) => g.dispose());
  }, [geometries]);
  useEffect(() => {
    return () => new Set(Object.values(materials)).forEach((m) => m.dispose());
  }, [materials]);
  // three.js only honours envMapIntensity for a material's own envMap (scene.environment
  // uses scene.environmentIntensity), so point the pieces at the sky's map explicitly.
  useFrame(({ scene }) => {
    for (const material of Object.values(materials)) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      if (material.envMap !== scene.environment) {
        material.envMap = scene.environment;
        material.needsUpdate = true;
      }
    }
  });

  const drag = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const wasSelected = useRef(false);

  const ply = moves.length;
  // Cinematic capture: who strikes, from where, and in which direction.
  const cinematic = useSettings((s) => s.captureFx === 'cinematic');
  const attack = useMemo(() => {
    const last = moves.at(-1);
    if (!cinematic || !last?.captured) return null;
    const mover = pieceAt(piecesFromFen(last.fenAfter), last.to);
    if (!mover) return null;
    return {
      square: last.to,
      // A promoting pawn strikes as a pawn.
      type: last.promotion ? ('p' as const) : mover.type,
      direction: attackDirection(squareToVector(last.from), squareToVector(last.to)),
    };
  }, [moves, cinematic]);
  const onImpact = (amount: number) => {
    shake.current = Math.max(shake.current, amount);
  };
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
      drag.current = {
        square: piece.square,
        point: squareToVector(piece.square),
        screen: { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY },
      };
      setDragging(true);
    }
  };

  const endDrag = (point: Vector3 | null, screen?: { x: number; y: number }) => {
    const current = drag.current;
    drag.current = null;
    setDragging(false);
    if (!current) return;
    // A click on a tall piece hits the board plane on a square behind it: without this,
    // clicking a king would try to move it there and drop the selection.
    const clicked =
      screen !== undefined &&
      Math.hypot(screen.x - current.screen.x, screen.y - current.screen.y) < CLICK_SLOP;
    const target = clicked ? current.square : point ? vectorToSquare(point) : null;
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
      {/* The player can adjust the view (limits are set per view by the camera rig); no
          panning, so the board stays centred. */}
      <OrbitControls
        makeDefault
        enabled={!dragging}
        enableRotate={interactive}
        enableZoom={interactive}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={!interactive || autoRotate}
        autoRotateSpeed={interactive ? 0.5 : 0.35}
      />

      <group ref={boardGroup}>
        <mesh position={[0, -0.21, 0]} receiveShadow castShadow>
          <boxGeometry args={[9.1, 0.4, 9.1]} />
          <meshStandardMaterial color={theme.frame} roughness={0.6} />
        </mesh>

        {/* Light and dark squares, each baked into one mesh; the square comes from the hit point. */}
        {(['light', 'dark'] as const).map((shade) => (
          <mesh
            key={shade}
            geometry={squareGeometry[shade]}
            receiveShadow
            onPointerDown={(e) => {
              if (!interactive) return;
              e.stopPropagation();
              const square = vectorToSquare(
                boardGroup.current?.worldToLocal(e.point.clone()) ?? e.point,
              );
              if (square) store.getState().select(square);
            }}
          >
            <meshStandardMaterial
              color={shade === 'light' ? theme.lightSquare : theme.darkSquare}
              roughness={theme.id === 'marble' ? 0.2 : 0.7}
              metalness={theme.id === 'neon' ? 0.3 : 0}
            />
          </mesh>
        ))}

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
              attack={attack?.square === piece.square ? attack.type : null}
              geometry={figureOf(piece)?.body ?? geometries[piece.type]}
              figure={figureOf(piece)}
              restYaw={restYaw(piece)}
              material={materials[piece.color]}
              outline={theme.outline[piece.color]}
              lifted={piece.square === selected}
              drag={drag}
              interactive={interactive && (canMove || targets.has(piece.square))}
              onPointerDown={onPiecePointerDown}
            />
          );
        })}

        {captured && attack && (
          <SlicedPiece
            key={`sliced@${ply}`}
            piece={captured}
            geometry={figureOf(captured)?.whole ?? geometries[captured.type]}
            yaw={restYaw(captured)}
            material={materials[captured.color]}
            outline={theme.outline[captured.color]}
            outlineWidth={PIECE_OUTLINE}
            attacker={attack.type}
            direction={attack.direction}
            onImpact={onImpact}
          />
        )}
        {captured && !attack && (
          <CapturedPiece
            key={`captured@${ply}`}
            piece={captured}
            yaw={restYaw(captured)}
            geometry={figureOf(captured)?.whole ?? geometries[captured.type]}
            material={materials[captured.color]}
            outline={theme.outline[captured.color]}
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
            endDrag(e.point, { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
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

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

interface PieceProps {
  piece: BoardPiece;
  from: string | undefined;
  /** Strike style when this piece just captured with the cinematic effect. */
  attack: PieceType | null;
  geometry: BufferGeometry;
  /** The soldier figure drawn instead of a chess piece, with its weapon arm. */
  figure: Figure | null;
  restYaw: number;
  material: Material;
  outline: string;
  lifted: boolean;
  drag: RefObject<DragState | null>;
  interactive: boolean;
  onPointerDown: (event: ThreeEvent<PointerEvent>, piece: BoardPiece) => void;
}

function Piece({
  piece,
  from,
  attack,
  geometry,
  figure,
  restYaw,
  material,
  outline,
  lifted,
  drag,
  interactive,
  onPointerDown,
}: PieceProps) {
  const arm = useRef<Group>(null);
  const ref = useRef<Group>(null);
  const target = useMemo(() => squareToVector(piece.square), [piece.square]);
  const start = useMemo(() => (from ? squareToVector(from) : null), [from]);
  const elapsed = useRef(0);
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
    if (start && attack && elapsed.current < ATTACK_TIME) {
      const time = elapsed.current;
      elapsed.current = Math.min(ATTACK_TIME, time + delta * effectSpeed(time));
      const pose = attackPose(attack, elapsed.current, start, target);
      group.position.copy(pose.position);
      const dir = attackDirection(start, target);
      // Figures and knights turn to charge at the target, then settle back.
      const charge = figure
        ? figureYawTowards(dir)
        : piece.type === 'n'
          ? Math.atan2(-dir.z, dir.x)
          : restYaw;
      if (arm.current) arm.current.rotation.x = weaponSwing(elapsed.current);
      const back = Math.max(0, (elapsed.current - (ATTACK_TIME - SETTLE)) / SETTLE);
      const yaw = charge + (restYaw - charge) * back + pose.spin;
      group.quaternion
        .setFromAxisAngle(new Vector3().crossVectors(UP, dir).normalize(), pose.pitch)
        .multiply(new Quaternion().setFromAxisAngle(UP, yaw));
      if (elapsed.current >= ATTACK_TIME) {
        group.quaternion.setFromAxisAngle(UP, restYaw);
        if (arm.current) arm.current.rotation.x = 0;
      }
      return;
    }
    if (start && !attack && elapsed.current < MOVE_DURATION) {
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
      rotation-y={restYaw}
      onPointerDown={(e) => onPointerDown(e, piece)}
      onPointerOver={() => setCursor('grab')}
      onPointerOut={() => setCursor('auto')}
    >
      <mesh geometry={geometry} material={material} castShadow receiveShadow>
        <PieceOutline geometry={geometry} color={outline} thickness={PIECE_OUTLINE} />
      </mesh>
      {figure && (
        // The weapon arm swings around the shoulder when the figure strikes.
        <group ref={arm} position={figure.pivot}>
          <mesh
            geometry={figure.weapon}
            material={material}
            position={figure.pivot.clone().negate()}
            castShadow
          >
            <PieceOutline geometry={figure.weapon} color={outline} thickness={PIECE_OUTLINE} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Weapon arm angle during an attack: raised back on the approach, slashed down on the strike. */
const weaponSwing = (time: number): number => {
  const windup = APPROACH - 0.28;
  if (time < windup) return 0;
  if (time < APPROACH) return 1.3 * easeInOut((time - windup) / 0.28);
  if (time < APPROACH + STRIKE) return 1.3 - 2.9 * easeInOut((time - APPROACH) / STRIKE);
  return -1.6 * (1 - easeInOut(Math.min(1, (time - APPROACH - STRIKE) / SETTLE)));
};

/** A captured piece flies up and off the board, shrinking as it goes. */
function CapturedPiece({
  piece,
  yaw,
  geometry,
  material,
  outline,
}: {
  piece: BoardPiece;
  yaw: number;
  geometry: BufferGeometry;
  material: Material;
  outline: string;
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
    <group ref={ref} position={origin} rotation-y={yaw}>
      <mesh geometry={geometry} material={material} castShadow>
        <PieceOutline geometry={geometry} color={outline} thickness={PIECE_OUTLINE} />
      </mesh>
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
