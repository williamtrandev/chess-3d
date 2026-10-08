import { Chess, DEFAULT_POSITION, validateFen, type Move } from 'chess.js';
import { draw, win } from './outcome.js';
import {
  opposite,
  type Color,
  type GameOutcome,
  type MoveInput,
  type MoveRecord,
  type PromotionPiece,
} from './types.js';

export { DEFAULT_POSITION as STARTING_FEN };

export type MoveRejection = 'game_over' | 'not_your_turn' | 'illegal_move';

export type MoveResult =
  | { ok: true; move: MoveRecord; outcome: GameOutcome | null }
  | { ok: false; reason: MoveRejection };

export class InvalidPositionError extends Error {
  override readonly name = 'InvalidPositionError';
}

const toColor = (c: 'w' | 'b'): Color => (c === 'w' ? 'white' : 'black');

const UCI_PATTERN = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** Parse long algebraic notation (`e2e4`, `e7e8q`). Returns null when malformed. */
export const parseUci = (uci: string): MoveInput | null => {
  const match = UCI_PATTERN.exec(uci);
  if (!match) return null;
  const [, from, to, promotion] = match as unknown as [string, string, string, string | undefined];
  return promotion ? { from, to, promotion: promotion as PromotionPiece } : { from, to };
};

const toRecord = (move: Move): MoveRecord => {
  const promotion = move.promotion as PromotionPiece | undefined;
  return {
    color: toColor(move.color),
    from: move.from,
    to: move.to,
    ...(promotion ? { promotion } : {}),
    san: move.san,
    uci: move.lan,
    captured: move.isCapture(),
    check: move.san.endsWith('+') || move.san.endsWith('#'),
    fenAfter: move.after,
  };
};

/**
 * A single chess game: validates moves and detects every end condition that can be
 * derived from the board. Time, resignation, draw offers and abandonment are decided
 * by the caller and recorded with {@link ChessGame.end} / {@link ChessGame.timeout}.
 */
export class ChessGame {
  readonly startFen: string;
  readonly #chess: Chess;
  readonly #moves: MoveRecord[] = [];
  #outcome: GameOutcome | null = null;

  constructor(startFen: string = DEFAULT_POSITION) {
    const validation = validateFen(startFen);
    if (!validation.ok) throw new InvalidPositionError(validation.error ?? 'Invalid FEN');
    this.startFen = startFen;
    this.#chess = new Chess(startFen);
    this.#outcome = this.#boardOutcome(null);
  }

  /** Rebuild a game from its move list (e.g. a Redis snapshot). Throws on any illegal move. */
  static replay(uciMoves: readonly string[], startFen: string = DEFAULT_POSITION): ChessGame {
    const game = new ChessGame(startFen);
    for (const uci of uciMoves) {
      const input = parseUci(uci);
      const result = input ? game.move(input) : null;
      if (!result?.ok) {
        throw new InvalidPositionError(`Cannot replay move "${uci}" at ply ${game.ply + 1}`);
      }
    }
    return game;
  }

  get fen(): string {
    return this.#chess.fen();
  }

  get turn(): Color {
    return toColor(this.#chess.turn());
  }

  get ply(): number {
    return this.#moves.length;
  }

  get moves(): readonly MoveRecord[] {
    return [...this.#moves];
  }

  get lastMove(): MoveRecord | null {
    return this.#moves.at(-1) ?? null;
  }

  get isCheck(): boolean {
    return this.#chess.inCheck();
  }

  get outcome(): GameOutcome | null {
    return this.#outcome;
  }

  get isOver(): boolean {
    return this.#outcome !== null;
  }

  /** Legal moves for the side to move, optionally limited to one origin square. */
  legalMoves(square?: string): MoveInput[] {
    if (this.isOver) return [];
    const moves = square
      ? this.#chess.moves({ square: square as never, verbose: true })
      : this.#chess.moves({ verbose: true });
    return moves.map((m) => {
      const promotion = m.promotion as PromotionPiece | undefined;
      return promotion ? { from: m.from, to: m.to, promotion } : { from: m.from, to: m.to };
    });
  }

  /**
   * Try to play a move. When `by` is given, the move is rejected unless it is that side's turn.
   * A pawn reaching the last rank must specify `promotion`.
   */
  move(input: MoveInput, by?: Color): MoveResult {
    if (this.isOver) return { ok: false, reason: 'game_over' };
    if (by !== undefined && by !== this.turn) return { ok: false, reason: 'not_your_turn' };

    let played: Move;
    try {
      played = this.#chess.move(
        input.promotion
          ? { from: input.from, to: input.to, promotion: input.promotion }
          : { from: input.from, to: input.to },
      );
    } catch {
      return { ok: false, reason: 'illegal_move' };
    }

    const record = toRecord(played);
    this.#moves.push(record);
    this.#outcome = this.#boardOutcome(record.color);
    return { ok: true, move: record, outcome: this.#outcome };
  }

  /**
   * Record an externally decided outcome (resignation, draw agreement, abandonment, abort).
   * Has no effect if the game is already over; returns the final outcome either way.
   */
  end(outcome: GameOutcome): GameOutcome {
    this.#outcome ??= outcome;
    return this.#outcome;
  }

  /**
   * `flagged` ran out of time. The opponent wins, unless the opponent cannot possibly
   * checkmate, in which case the game is drawn (FIDE 6.9).
   */
  timeout(flagged: Color): GameOutcome {
    const opponent = opposite(flagged);
    return this.end(
      this.hasMatingMaterial(opponent)
        ? win(opponent, 'timeout')
        : draw('timeout_vs_insufficient_material'),
    );
  }

  /**
   * Whether `color` still has enough material to deliver mate: any pawn, rook or queen,
   * or at least two minor pieces. A lone king or a king with one minor piece cannot.
   */
  hasMatingMaterial(color: Color): boolean {
    const side = color === 'white' ? 'w' : 'b';
    let minors = 0;
    for (const row of this.#chess.board()) {
      for (const piece of row) {
        if (!piece || piece.color !== side) continue;
        if (piece.type === 'p' || piece.type === 'r' || piece.type === 'q') return true;
        if (piece.type === 'b' || piece.type === 'n') minors += 1;
      }
    }
    return minors >= 2;
  }

  /** PGN of the game with the given headers; `Result` is filled in from the outcome. */
  pgn(headers: Record<string, string> = {}): string {
    const pgnGame = new Chess(this.startFen);
    for (const [key, value] of Object.entries(headers)) pgnGame.setHeader(key, value);
    for (const move of this.#moves) pgnGame.move(move.uci);
    pgnGame.setHeader('Result', this.#outcome?.result ?? '*');
    return pgnGame.pgn();
  }

  #boardOutcome(mover: Color | null): GameOutcome | null {
    const chess = this.#chess;
    if (chess.isCheckmate()) return win(mover ?? opposite(this.turn), 'checkmate');
    if (chess.isStalemate()) return draw('stalemate');
    if (chess.isInsufficientMaterial()) return draw('insufficient_material');
    if (chess.isThreefoldRepetition()) return draw('threefold_repetition');
    if (chess.isDrawByFiftyMoves()) return draw('fifty_move_rule');
    return null;
  }
}
