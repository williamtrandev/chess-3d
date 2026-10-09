'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Matrix4,
  MeshBasicMaterial,
  Plane,
  Quaternion,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type Group,
  type Material,
  type Mesh,
} from 'three';
import type { BoardPiece, PieceType } from '@/lib/board';
import { squareToVector } from '@/lib/board-space';
import { DEBRIS_TIME, FADE_START, IMPACT, SLASH, effectSpeed, slashNormal } from '@/lib/capture-fx';
import { PieceOutline } from './PieceOutline';

const UP = new Vector3(0, 1, 0);
const FLASH_TIME = 0.32;

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const bounceOut = (t: number) => {
  if (t < 0.7) return easeOut(t / 0.7);
  const b = (t - 0.7) / 0.3;
  return 1 - Math.sin(b * Math.PI) * 0.08;
};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

interface SlicedPieceProps {
  piece: BoardPiece;
  geometry: BufferGeometry;
  material: Material;
  outline: string;
  outlineWidth: number;
  /** Rest turn of the piece around the vertical axis. */
  yaw: number;
  /** Type of the capturing piece, which decides the cut. */
  attacker: PieceType;
  /** Horizontal direction of the attack. */
  direction: Vector3;
  onImpact: (shake: number) => void;
}

/**
 * The captured piece: it waits for the blow, is cut in two along the attacker's slash,
 * and the halves topple onto the board and fade away.
 */
export function SlicedPiece({
  piece,
  geometry,
  material,
  outline,
  outlineWidth,
  yaw,
  attacker,
  direction,
  onImpact,
}: SlicedPieceProps) {
  const origin = useMemo(() => squareToVector(piece.square), [piece.square]);
  const style = SLASH[attacker];

  const cut = useMemo(() => {
    geometry.computeBoundingBox();
    const height = geometry.boundingBox?.max.y ?? 0.8;
    const normal = slashNormal(style, direction);
    const horizontal = Math.abs(normal.y) > 0.85;
    return { height: height * style.height, normal, horizontal };
  }, [geometry, style, direction]);

  // Each half gets its own see-through, double-sided copy of the piece material, clipped
  // to its side of the cut.
  const halves = useMemo(
    () =>
      [1, -1].map((sign) => {
        const clone = material.clone();
        clone.transparent = true;
        clone.side = DoubleSide;
        clone.clippingPlanes = [new Plane()];
        return { sign, material: clone };
      }),
    [material],
  );
  useEffect(() => () => halves.forEach((h) => h.material.dispose()), [halves]);

  const flash = useMemo(
    () => ({
      geometry: new TorusGeometry(0.42, 0.022, 6, 40, Math.PI * 0.95),
      material: new MeshBasicMaterial({
        // Brighter than white so the bloom pass makes it glow.
        color: new Color(4, 3.6, 2.6),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
      facing: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), cut.normal),
    }),
    [cut.normal],
  );
  useEffect(
    () => () => {
      flash.geometry.dispose();
      flash.material.dispose();
    },
    [flash],
  );

  const whole = useRef<Group>(null);
  const pivots = useRef<(Group | null)[]>([]);
  const slash = useRef<Mesh>(null);
  const elapsed = useRef(0);
  const struck = useRef(false);

  useFrame((_, delta) => {
    const time = elapsed.current;
    elapsed.current += delta * effectSpeed(time);
    const before = time < IMPACT;
    if (whole.current) whole.current.visible = before;
    if (before) {
      pivots.current.forEach((p) => p && (p.visible = false));
      if (slash.current) slash.current.visible = false;
      return;
    }
    if (!struck.current) {
      struck.current = true;
      onImpact(style.shake);
    }
    const since = time - IMPACT;

    // The slash: a bright arc sweeping through the cut.
    if (slash.current) {
      const f = since / FLASH_TIME;
      slash.current.visible = f < 1;
      slash.current.scale.setScalar(0.6 + f * 0.8);
      slash.current.quaternion
        .copy(flash.facing)
        .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -f * 1.2));
      flash.material.opacity = 1 - f;
    }

    const opacity =
      since < FADE_START ? 1 : clamp01(1 - (since - FADE_START) / (DEBRIS_TIME - FADE_START));
    halves.forEach(({ sign, material: half }, i) => {
      const pivot = pivots.current[i];
      if (!pivot) return;
      pivot.visible = since < DEBRIS_TIME;
      half.opacity = opacity;
      half.depthWrite = opacity > 0.6;

      const pivotPoint = new Vector3();
      const offset = new Vector3();
      const rotation = new Quaternion();
      if (cut.horizontal) {
        if (sign > 0) {
          // The top slides off along the blow, drops to the board and tips over.
          const f = clamp01(since / 0.55);
          pivotPoint.set(0, cut.height, 0);
          offset
            .copy(direction)
            .multiplyScalar(0.85 * easeOut(f))
            .setY(-(cut.height - 0.12) * bounceOut(f));
          rotation.setFromAxisAngle(
            new Vector3().crossVectors(UP, direction).normalize(),
            1.45 * easeOut(f),
          );
        } else {
          // The base stays put with a short wobble.
          const wobble = Math.sin(since * 22) * 0.08 * Math.exp(-since * 5);
          rotation.setFromAxisAngle(new Vector3().crossVectors(UP, direction).normalize(), wobble);
        }
      } else {
        // Both halves topple away from the cut, pivoting on the rim of the base.
        const away = cut.normal.clone().setY(0).multiplyScalar(sign);
        if (away.lengthSq() < 1e-6) away.copy(direction).multiplyScalar(sign);
        away.normalize();
        const f = clamp01(since / 0.6);
        pivotPoint.copy(away).multiplyScalar(0.25);
        offset
          .copy(away)
          .multiplyScalar(0.45 * easeOut(f))
          .setY(Math.sin(Math.PI * clamp01(since / 0.3)) * 0.2);
        rotation.setFromAxisAngle(
          new Vector3().crossVectors(UP, away).normalize(),
          1.35 * bounceOut(f),
        );
      }

      pivot.matrix
        .makeTranslation(origin.x + offset.x, offset.y, origin.z + offset.z)
        .multiply(new Matrix4().makeTranslation(pivotPoint.x, pivotPoint.y, pivotPoint.z))
        .multiply(new Matrix4().makeRotationFromQuaternion(rotation))
        .multiply(new Matrix4().makeTranslation(-pivotPoint.x, -pivotPoint.y, -pivotPoint.z));
      pivot.updateMatrixWorld(true);

      // Keep the clip plane glued to the half as it moves.
      const plane = half.clippingPlanes?.[0];
      plane
        ?.setFromNormalAndCoplanarPoint(
          cut.normal.clone().multiplyScalar(sign),
          new Vector3(0, cut.height, 0),
        )
        .applyMatrix4(pivot.matrixWorld);
    });
  });

  return (
    <>
      <group ref={whole} position={origin} rotation-y={yaw}>
        <mesh geometry={geometry} material={material} castShadow>
          <PieceOutline geometry={geometry} color={outline} thickness={outlineWidth} />
        </mesh>
      </group>
      {halves.map((half, i) => (
        <group
          key={half.sign}
          ref={(g) => {
            pivots.current[i] = g;
          }}
          matrixAutoUpdate={false}
          visible={false}
        >
          {/* The cut is made in the pivot's frame, so the plane ignores the knight's turn. */}
          <mesh geometry={geometry} material={half.material} rotation-y={yaw} castShadow />
        </group>
      ))}
      <mesh
        ref={slash}
        geometry={flash.geometry}
        material={flash.material}
        position={[origin.x, cut.height, origin.z]}
        visible={false}
      />
    </>
  );
}
