export type Color = 'white' | 'black';

export type PromotionPiece = 'q' | 'r' | 'b' | 'n';

/** Standard PGN result notation. */
export type GameResult = '1-0' | '0-1' | '1/2-1/2';

export type EndReason =
  | 'checkmate'
  | 'stalemate'
  | 'insufficient_material'
  | 'threefold_repetition'
  | 'fifty_move_rule'
  | 'timeout'
  | 'timeout_vs_insufficient_material'
  | 'resignation'
  | 'draw_agreement'
  | 'abandonment'
  | 'aborted';

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
