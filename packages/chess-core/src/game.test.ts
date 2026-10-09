import { describe, expect, it } from 'vitest';
import { ChessGame, InvalidPositionError, STARTING_FEN, parseUci } from './game.js';
import { resign } from './outcome.js';

const play = (game: ChessGame, ...uci: string[]) => {
  for (const m of uci) {
    const input = parseUci(m);
    if (!input) throw new Error(`bad uci ${m}`);
    const result = game.move(input);
    if (!result.ok) throw new Error(`${m} rejected: ${result.reason}`);
  }
  return game;
};

describe('parseUci', () => {
  it('parses plain and promotion moves', () => {
    expect(parseUci('e2e4')).toEqual({ from: 'e2', to: 'e4' });
    expect(parseUci('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' });
  });

  it('returns null for malformed input', () => {
    expect(parseUci('e2')).toBeNull();
    expect(parseUci('i2i4')).toBeNull();
    expect(parseUci('e7e8k')).toBeNull();
  });
});

describe('ChessGame', () => {
  it('starts from the standard position with white to move', () => {
    const game = new ChessGame();
    expect(game.fen).toBe(STARTING_FEN);
    expect(game.turn).toBe('white');
    expect(game.ply).toBe(0);
    expect(game.lastMove).toBeNull();
    expect(game.outcome).toBeNull();
    expect(game.legalMoves()).toHaveLength(20);
  });

  it('rejects an invalid FEN', () => {
    expect(() => new ChessGame('not a fen')).toThrow(InvalidPositionError);
  });

  it('lists legal moves for one square', () => {
    const targets = new ChessGame().legalMoves('e2').map((m) => m.to);
    expect(targets.sort()).toEqual(['e3', 'e4']);
  });

  it('plays a legal move and records it', () => {
    const game = new ChessGame();
    const result = game.move({ from: 'e2', to: 'e4' });
    expect(result).toMatchObject({
      ok: true,
      outcome: null,
      move: { color: 'white', san: 'e4', uci: 'e2e4', captured: false, check: false },
    });
    expect(game.turn).toBe('black');
    expect(game.lastMove?.fenAfter).toBe(game.fen);
  });

  it('rejects illegal moves without changing state', () => {
    const game = new ChessGame();
    expect(game.move({ from: 'e2', to: 'e5' })).toEqual({ ok: false, reason: 'illegal_move' });
    expect(game.move({ from: 'e7', to: 'e5' })).toEqual({ ok: false, reason: 'illegal_move' });
    expect(game.fen).toBe(STARTING_FEN);
  });

  it('rejects a move made by the side not to move', () => {
    const game = new ChessGame();
    expect(game.move({ from: 'e2', to: 'e4' }, 'black')).toEqual({
      ok: false,
      reason: 'not_your_turn',
    });
    expect(game.move({ from: 'e2', to: 'e4' }, 'white').ok).toBe(true);
  });

  it('records captures', () => {
    const game = play(new ChessGame(), 'e2e4', 'd7d5');
    const result = game.move({ from: 'e4', to: 'd5' });
    expect(result.ok && result.move.captured).toBe(true);
  });

  describe('promotion', () => {
    const fen = '8/P7/8/8/8/8/k7/4K3 w - - 0 1';

    it('requires a promotion piece', () => {
      expect(new ChessGame(fen).move({ from: 'a7', to: 'a8' }).ok).toBe(false);
    });

    it('promotes to the chosen piece', () => {
      const result = new ChessGame(fen).move({ from: 'a7', to: 'a8', promotion: 'n' });
      expect(result).toMatchObject({ ok: true, move: { promotion: 'n', uci: 'a7a8n' } });
    });

    it('exposes promotion options in legal moves', () => {
      const options = new ChessGame(fen).legalMoves('a7').map((m) => m.promotion);
      expect(options.sort()).toEqual(['b', 'n', 'q', 'r']);
    });
  });

  describe('end conditions from the board', () => {
    it('detects checkmate (fool’s mate)', () => {
      const game = play(new ChessGame(), 'f2f3', 'e7e5', 'g2g4', 'd8h4');
      expect(game.outcome).toEqual({ result: '0-1', winner: 'black', reason: 'checkmate' });
      expect(game.isCheck).toBe(true);
      expect(game.lastMove?.check).toBe(true);
      expect(game.isOver).toBe(true);
    });

    it('rejects moves and lists none once the game is over', () => {
      const game = play(new ChessGame(), 'f2f3', 'e7e5', 'g2g4', 'd8h4');
      expect(game.move({ from: 'a2', to: 'a3' })).toEqual({ ok: false, reason: 'game_over' });
      expect(game.legalMoves()).toEqual([]);
    });

    it('detects a position that is already mate when loaded', () => {
      const game = new ChessGame('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
      expect(game.outcome).toEqual({ result: '1-0', winner: 'white', reason: 'checkmate' });
    });

    it('detects stalemate', () => {
      const game = play(new ChessGame('7k/8/6K1/8/8/8/5Q2/8 w - - 0 1'), 'f2f7');
      expect(game.outcome).toEqual({ result: '1/2-1/2', winner: null, reason: 'stalemate' });
    });

    it('detects insufficient material', () => {
      const game = play(new ChessGame('8/8/8/8/4k3/8/8/Kr6 w - - 0 1'), 'a1b1');
      expect(game.outcome?.reason).toBe('insufficient_material');
    });

    it('detects threefold repetition', () => {
      const game = play(
        new ChessGame(),
        'g1f3',
        'g8f6',
        'f3g1',
        'f6g8',
        'g1f3',
        'g8f6',
        'f3g1',
        'f6g8',
      );
      expect(game.outcome?.reason).toBe('threefold_repetition');
    });

    it('detects the fifty-move rule', () => {
      const game = play(new ChessGame('8/8/8/4k3/8/8/8/K6R w - - 99 80'), 'h1h2');
      expect(game.outcome?.reason).toBe('fifty_move_rule');
    });
  });

  describe('externally decided outcomes', () => {
    it('records resignation and ignores later outcomes', () => {
      const game = new ChessGame();
      expect(game.end(resign('white'))).toMatchObject({ winner: 'black', reason: 'resignation' });
      expect(game.timeout('black')).toMatchObject({ reason: 'resignation' });
      expect(game.move({ from: 'e2', to: 'e4' })).toEqual({ ok: false, reason: 'game_over' });
    });

    it('awards a timeout win to an opponent with mating material', () => {
      expect(new ChessGame().timeout('white')).toEqual({
        result: '0-1',
        winner: 'black',
        reason: 'timeout',
      });
    });

    it('draws a timeout when the opponent cannot mate', () => {
      const fen = '4k3/8/8/8/8/8/P7/K1n5 w - - 0 1';
      expect(new ChessGame(fen).timeout('white')).toEqual({
        result: '1/2-1/2',
        winner: null,
        reason: 'timeout_vs_insufficient_material',
      });
      expect(new ChessGame(fen).timeout('black')).toMatchObject({
        winner: 'white',
        reason: 'timeout',
      });
    });
  });

  describe('hasMatingMaterial', () => {
    it.each([
      ['4k3/8/8/8/8/8/8/K7 w - - 0 1', false],
      ['4k3/8/8/8/8/8/8/KB6 w - - 0 1', false],
      ['4k3/8/8/8/8/8/8/KBN5 w - - 0 1', true],
      ['4k3/8/8/8/8/8/8/KR6 w - - 0 1', true],
      ['4k3/8/8/8/8/8/P7/K7 w - - 0 1', true],
    ])('%s → %s for white', (fen, expected) => {
      expect(new ChessGame(fen).hasMatingMaterial('white')).toBe(expected);
    });
  });

  describe('replay', () => {
    it('rebuilds the same position and history', () => {
      const original = play(new ChessGame(), 'e2e4', 'e7e5', 'g1f3', 'b8c6');
      const restored = ChessGame.replay(original.moves.map((m) => m.uci));
      expect(restored.fen).toBe(original.fen);
      expect(restored.moves).toEqual(original.moves);
    });

    it('keeps repetition history so threefold still triggers after a restore', () => {
      const restored = ChessGame.replay(['g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1']);
      restored.move({ from: 'f6', to: 'g8' });
      expect(restored.outcome?.reason).toBe('threefold_repetition');
    });

    it('throws on an illegal or malformed move', () => {
      expect(() => ChessGame.replay(['e2e4', 'e2e4'])).toThrow(/ply 2/);
      expect(() => ChessGame.replay(['xx'])).toThrow(InvalidPositionError);
    });
  });

  describe('pgn', () => {
    it('includes headers, moves and the result', () => {
      const game = play(new ChessGame(), 'f2f3', 'e7e5', 'g2g4', 'd8h4');
      const pgn = game.pgn({ White: 'Alice', Black: 'Bob' });
      expect(pgn).toContain('[White "Alice"]');
      expect(pgn).toContain('[Result "0-1"]');
      expect(pgn).toContain('1. f3 e5 2. g4 Qh4#');
    });

    it('marks an unfinished game with *', () => {
      expect(play(new ChessGame(), 'e2e4').pgn()).toContain('[Result "*"]');
    });
  });
});
