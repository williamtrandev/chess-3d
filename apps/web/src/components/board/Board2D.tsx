'use client';

import { useState, type DragEvent } from 'react';
import { SQUARES, isLightSquare, pieceAt, type BoardPiece } from '@/lib/board';
import type { Theme } from '@/lib/themes';
import { useGame } from '../game/game-context';
import { useBoardState } from './board-state';

const GLYPHS: Record<BoardPiece['type'], string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

const PIECE_NAMES: Record<BoardPiece['type'], string> = {
  k: 'vua',
  q: 'hậu',
  r: 'xe',
  b: 'tượng',
  n: 'mã',
  p: 'tốt',
};

/** Accessible DOM board: fallback when WebGL is unavailable and the target for E2E tests. */
export function Board2D({ theme }: { theme: Theme }) {
  const orientation = useGame((s) => s.orientation);
  const select = useGame((s) => s.select);
  const tryMove = useGame((s) => s.tryMove);
  const turn = useGame((s) => s.turn);
  const { pieces, selected, targets, lastMove, checkSquare, canMove } = useBoardState();
  const [dragFrom, setDragFrom] = useState<string | null>(null);

  const squares = orientation === 'white' ? SQUARES : [...SQUARES].reverse();

  const onDrop = (event: DragEvent, square: string) => {
    event.preventDefault();
    if (dragFrom && dragFrom !== square) tryMove(dragFrom, square);
    setDragFrom(null);
  };

  return (
    <div
      role="grid"
      aria-label="Bàn cờ"
      className="grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-lg shadow-2xl select-none"
      style={{ outline: `10px solid ${theme.frame}` }}
    >
      {squares.map((square) => {
        const piece = pieceAt(pieces, square);
        const isTarget = targets.has(square);
        const highlighted =
          square === selected || square === lastMove?.from || square === lastMove?.to;
        return (
          <button
            key={square}
            type="button"
            role="gridcell"
            data-square={square}
            aria-label={
              piece
                ? `${square} ${PIECE_NAMES[piece.type]} ${piece.color === 'white' ? 'trắng' : 'đen'}`
                : square
            }
            aria-selected={square === selected}
            onClick={() => select(square)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, square)}
            className="relative flex items-center justify-center"
            style={{ background: isLightSquare(square) ? theme.lightSquare : theme.darkSquare }}
          >
            {highlighted && <span className="absolute inset-0 bg-yellow-300/40" />}
            {square === checkSquare && (
              <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(239,68,68,0.85)_0%,transparent_70%)]" />
            )}
            {isTarget && (
              <span
                className={
                  piece
                    ? 'absolute inset-1 rounded-full border-4 border-black/25'
                    : 'absolute h-1/4 w-1/4 rounded-full bg-black/25'
                }
              />
            )}
            {piece && (
              <span
                draggable={canMove && piece.color === turn}
                onDragStart={() => {
                  select(square);
                  setDragFrom(square);
                }}
                className="relative text-[min(9vw,4.2rem)] leading-none"
                style={{
                  color: piece.color === 'white' ? theme.white.color : theme.black.color,
                  textShadow:
                    piece.color === 'white'
                      ? '0 0 2px #000, 0 2px 3px rgba(0,0,0,0.6)'
                      : '0 0 2px #fff8, 0 2px 3px rgba(0,0,0,0.6)',
                }}
              >
                {GLYPHS[piece.type]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
