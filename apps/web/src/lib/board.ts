import type { Color } from '@chess3d/chess-core';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface BoardPiece {
  square: string;
  color: Color;
  type: PieceType;
}

export const FILES = 'abcdefgh';

/** Board squares in reading order from white's side: a8, b8 … h1. */
export const SQUARES: readonly string[] = Array.from({ length: 64 }, (_, i) => {
  const file = FILES[i % 8];
  const rank = 8 - Math.floor(i / 8);
  return `${file}${rank}`;
});

/** Zero-based file (a=0) and rank (1=0) of a square. */
export const squareCoords = (square: string): { file: number; rank: number } => ({
  file: FILES.indexOf(square[0] ?? ''),
  rank: Number(square[1]) - 1,
});

export const isLightSquare = (square: string): boolean => {
  const { file, rank } = squareCoords(square);
  return (file + rank) % 2 === 1;
};

/** Pieces described by the placement field of a FEN string. */
export const piecesFromFen = (fen: string): BoardPiece[] => {
  const placement = fen.split(' ')[0] ?? '';
  const pieces: BoardPiece[] = [];
  placement.split('/').forEach((row, rowIndex) => {
    let file = 0;
    for (const char of row) {
      const empty = Number(char);
      if (empty) {
        file += empty;
        continue;
      }
      const lower = char.toLowerCase() as PieceType;
      pieces.push({
        square: `${FILES[file]}${8 - rowIndex}`,
        color: char === lower ? 'black' : 'white',
        type: lower,
      });
      file += 1;
    }
  });
  return pieces;
};

export const pieceAt = (pieces: readonly BoardPiece[], square: string): BoardPiece | undefined =>
  pieces.find((p) => p.square === square);

export const kingSquare = (pieces: readonly BoardPiece[], color: Color): string | undefined =>
  pieces.find((p) => p.type === 'k' && p.color === color)?.square;

const START_COUNTS: Record<Exclude<PieceType, 'k'>, number> = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const VALUES: Record<Exclude<PieceType, 'k'>, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };

export interface Material {
  /** Pieces of the opponent this side has captured, strongest first. */
  captured: Record<Color, Exclude<PieceType, 'k'>[]>;
  /** Material advantage in pawns (positive for the side ahead), per side. */
  advantage: Record<Color, number>;
}

/** Captured pieces and material balance, derived from the position alone. */
export const materialBalance = (pieces: readonly BoardPiece[]): Material => {
  const score: Record<Color, number> = { white: 0, black: 0 };
  const captured: Material['captured'] = { white: [], black: [] };
  for (const color of ['white', 'black'] as const) {
    const opponent = color === 'white' ? 'black' : 'white';
    for (const type of ['q', 'r', 'b', 'n', 'p'] as const) {
      const onBoard = pieces.filter((p) => p.color === color && p.type === type).length;
      score[color] += onBoard * VALUES[type];
      for (let i = onBoard; i < START_COUNTS[type]; i++) captured[opponent].push(type);
    }
  }
  const diff = score.white - score.black;
  return { captured, advantage: { white: Math.max(0, diff), black: Math.max(0, -diff) } };
};
