import { GROUND_Y } from '@/lib/scenery';
import { TABLE_HALF, TABLE_TOP_Y } from '@/lib/board-space';

/** Wooden table the board rests on. */
export function Table({ wood }: { wood: string }) {
  const thickness = 0.32;
  const top = TABLE_TOP_Y - thickness / 2;
  const legHeight = top - thickness / 2 - GROUND_Y;
  const corner = TABLE_HALF - 0.7;
  return (
    <group>
      <mesh position-y={top} castShadow receiveShadow>
        <boxGeometry args={[TABLE_HALF * 2, thickness, TABLE_HALF * 2]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>
      {[
        [-corner, -corner],
        [corner, -corner],
        [-corner, corner],
        [corner, corner],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x ?? 0, top - thickness / 2 - legHeight / 2, z ?? 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.22, legHeight, 10]} />
          <meshStandardMaterial color={wood} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}
