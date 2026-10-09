'use client';

import { useMemo } from 'react';
import { Vector3 } from 'three';
import type { Color } from '@chess3d/chess-core';
import { GUEST_AVATAR, ROBOT_AVATAR, type Avatar } from '@/lib/avatar';
import { useMyAvatar } from '@/lib/avatar-store';
import { CHARACTER_SCALE, SEAT_Y, SEAT_Z, squareToVector } from '@/lib/board-space';
import type { OwnAvatarMode } from '@/lib/camera-views';
import { useGame } from '../game/game-context';
import { Character, type Activity, type Reach } from './Character';

const CENTER = new Vector3(0, 0, 0);

/** The two players seated on either side of the table. */
export function Players({ occlusion, wood }: { occlusion: OwnAvatarMode; wood: string }) {
  const mode = useGame((s) => s.mode);
  const turn = useGame((s) => s.turn);
  const outcome = useGame((s) => s.outcome);
  const lastMove = useGame((s) => s.lastMove);
  const ply = useGame((s) => s.moves.length);
  const mine = useMyAvatar((s) => s.avatar);

  const avatars: Record<Color, Avatar> = useMemo(() => {
    if (mode.kind === 'ai') {
      return mode.playerColor === 'white'
        ? { white: mine, black: ROBOT_AVATAR }
        : { white: ROBOT_AVATAR, black: mine };
    }
    return { white: mine, black: GUEST_AVATAR };
  }, [mode, mine]);

  const focus = useMemo(() => (lastMove ? squareToVector(lastMove.to, 0.4) : CENTER), [lastMove]);

  const activity = (color: Color): Activity => {
    if (outcome) {
      if (outcome.winner === null) return 'idle';
      return outcome.winner === color ? 'won' : 'lost';
    }
    return turn === color ? 'thinking' : 'idle';
  };

  const reach = (color: Color): Reach | null =>
    lastMove && lastMove.color === color
      ? { target: squareToVector(lastMove.to, 0.4), key: ply }
      : null;

  return (
    <>
      {(['white', 'black'] as const).map((color) => (
        <group
          key={color}
          position={[0, SEAT_Y, color === 'white' ? SEAT_Z : -SEAT_Z]}
          rotation-y={color === 'white' ? 0 : Math.PI}
          scale={CHARACTER_SCALE}
        >
          <Character
            avatar={avatars[color]}
            activity={activity(color)}
            focus={focus}
            reach={reach(color)}
            occlusion={occlusion}
            wood={wood}
          />
        </group>
      ))}
    </>
  );
}
