export const COLORS = ['white', 'black'] as const;
export type Color = (typeof COLORS)[number];

export const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;
export type PromotionPiece = (typeof PROMOTION_PIECES)[number];

export const END_REASONS = [
  'checkmate',
  'stalemate',
  'insufficient_material',
  'threefold_repetition',
  'fifty_move_rule',
  'timeout',
  'timeout_vs_insufficient_material',
  'resignation',
  'draw_agreement',
  'abandonment',
  'aborted',
] as const;
export type EndReason = (typeof END_REASONS)[number];

/** Standard PGN result notation. */
export const GAME_RESULTS = ['1-0', '0-1', '1/2-1/2'] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

/**
 * Final state of a game. An aborted game has no result and is never rated.
 */
export type GameOutcome =
  | { result: GameResult; winner: Color | null; reason: Exclude<EndReason, 'aborted'> }
  | { result: null; winner: null; reason: 'aborted' };

export interface MoveInput {
  from: string;
  to: string;
  promotion?: PromotionPiece;
}

export interface MoveRecord {
  color: Color;
  from: string;
  to: string;
  promotion?: PromotionPiece;
  san: string;
  /** Long algebraic notation, e.g. `e2e4`, `e7e8q`. */
  uci: string;
  captured: boolean;
  check: boolean;
  fenAfter: string;
}

export const opposite = (color: Color): Color => (color === 'white' ? 'black' : 'white');
