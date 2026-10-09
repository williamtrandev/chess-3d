import type { Color, GameOutcome, GameResult } from './types.js';

export const winResult = (winner: Color): GameResult => (winner === 'white' ? '1-0' : '0-1');

export const win = (
  winner: Color,
  reason: 'checkmate' | 'timeout' | 'resignation' | 'abandonment',
): GameOutcome => ({ result: winResult(winner), winner, reason });

export const draw = (
  reason:
    | 'stalemate'
    | 'insufficient_material'
    | 'threefold_repetition'
    | 'fifty_move_rule'
    | 'timeout_vs_insufficient_material'
    | 'draw_agreement',
): GameOutcome => ({ result: '1/2-1/2', winner: null, reason });

export const aborted = (): GameOutcome => ({ result: null, winner: null, reason: 'aborted' });

/** The losing side resigns. */
export const resign = (resigning: Color): GameOutcome =>
  win(resigning === 'white' ? 'black' : 'white', 'resignation');

/** The disconnected side is declared to have abandoned the game. */
export const abandon = (abandoning: Color): GameOutcome =>
  win(abandoning === 'white' ? 'black' : 'white', 'abandonment');

export const agreeDraw = (): GameOutcome => draw('draw_agreement');

/** Whether the outcome should affect ratings. */
export const isRatable = (outcome: GameOutcome): boolean => outcome.reason !== 'aborted';
