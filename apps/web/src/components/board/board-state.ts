'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { kingSquare, piecesFromFen, type BoardPiece } from '@/lib/board';
import { useGame } from '../game/game-context';

/** Board-level view state shared by the 2D and 3D renderers. */
export interface BoardState {
  pieces: BoardPiece[];
  selected: string | null;
  targets: ReadonlySet<string>;
  lastMove: { from: string; to: string } | null;
  checkSquare: string | null;
  canMove: boolean;
}

export const useBoardState = (): BoardState => {
  const { fen, selected, targets, lastMove, isCheck, turn, canMove } = useGame(
    useShallow((s) => ({
      fen: s.fen,
      selected: s.selected,
      targets: s.targets,
      lastMove: s.lastMove,
      isCheck: s.isCheck,
      turn: s.turn,
      canMove: s.canPlayerMove(),
    })),
  );

  return useMemo(() => {
    const pieces = piecesFromFen(fen);
    return {
      pieces,
      selected,
      targets: new Set(targets.map((t) => t.to)),
      lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : null,
      checkSquare: isCheck ? (kingSquare(pieces, turn) ?? null) : null,
      canMove,
    };
  }, [fen, selected, targets, lastMove, isCheck, turn, canMove]);
};
