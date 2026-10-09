'use client';

import { Outlines } from '@react-three/drei';
import type { BufferGeometry } from 'three';

/**
 * Ink outline around a piece, `thickness` in world units (drei's `screenspace` flag means
 * world-space here). Baked, non-indexed geometry (the figures) already has smooth normals,
 * so it skips drei's crease pass, which would copy the geometry on every mount.
 */
export function PieceOutline({
  geometry,
  color,
  thickness,
}: {
  geometry: BufferGeometry;
  color: string;
  thickness: number;
}) {
  return (
    <Outlines
      thickness={thickness}
      color={color}
      screenspace
      toneMapped={false}
      angle={geometry.index ? Math.PI : 0}
    />
  );
}
