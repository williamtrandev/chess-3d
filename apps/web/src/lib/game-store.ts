import {
  ChessGame,
  opposite,
  parseUci,
  resign as resignOutcome,
  type Color,
  type GameOutcome,
  type MoveInput,
  type MoveRecord,
  type PromotionPiece,
} from '@chess3d/chess-core';
import { createStore } from 'zustand/vanilla';
import type { AiLevel } from './ai-levels';
import { piecesFromFen, pieceAt } from './board';

export type GameMode = { kind: 'ai'; level: AiLevel; playerColor: Color } | { kind: 'local' };

export type MoveAttempt = 'moved' | 'promotion' | 'illegal' | 'ignored';

export interface GameState {
  mode: GameMode;
  /** Increments with every new game, so late async results (engine moves) can be discarded. */
  gameNumber: number;
  startFen: string;
  fen: string;
  turn: Color;
  moves: readonly MoveRecord[];
  lastMove: MoveRecord | null;
  outcome: GameOutcome | null;
  isCheck: boolean;
  orientation: Color;
  selected: string | null;
  targets: readonly MoveInput[];
  pendingPromotion: { from: string; to: string } | null;
  /** Increments on every rejected attempt so the UI can react (shake, sound). */
  illegalAttempts: number;
}

export interface GameActions {
  newGame: (mode: GameMode, startFen?: string) => void;
  /** Click on a square: select a piece, move to a target, or clear the selection. */
  select: (square: string) => MoveAttempt;
  /** Drag-and-drop or direct move from the local player. */
  tryMove: (from: string, to: string) => MoveAttempt;
  choosePromotion: (piece: PromotionPiece | null) => MoveAttempt;
  /** Apply a move from the engine (or, later, the server). */
  applyUci: (uci: string) => boolean;
  resign: () => void;
  flip: () => void;
  canPlayerMove: () => boolean;
  /** Whether it is the engine's turn to move. */
  isEngineTurn: () => boolean;
}

export type GameStore = GameState & GameActions;

const snapshot = (game: ChessGame) => ({
  startFen: game.startFen,
  fen: game.fen,
  turn: game.turn,
  moves: game.moves,
  lastMove: game.lastMove,
  outcome: game.outcome,
  isCheck: game.isCheck,
});

const cleared = { selected: null, targets: [], pendingPromotion: null } as const;

export const createGameStore = (mode: GameMode = { kind: 'local' }) => {
  let game = new ChessGame();

  return createStore<GameStore>()((set, get) => {
    const playerColor = (): Color | null => {
      const { mode: m } = get();
      return m.kind === 'ai' ? m.playerColor : null;
    };

    const play = (input: MoveInput): MoveAttempt => {
      const result = game.move(input);
      if (!result.ok) {
        set((s) => ({ ...cleared, illegalAttempts: s.illegalAttempts + 1 }));
        return 'illegal';
      }
      set({ ...snapshot(game), ...cleared });
      return 'moved';
    };

    return {
      mode,
      gameNumber: 0,
      ...snapshot(game),
      orientation: mode.kind === 'ai' ? mode.playerColor : 'white',
      ...cleared,
      illegalAttempts: 0,

      newGame: (nextMode, startFen) => {
        game = new ChessGame(startFen);
        set((s) => ({
          mode: nextMode,
          gameNumber: s.gameNumber + 1,
          ...snapshot(game),
          orientation: nextMode.kind === 'ai' ? nextMode.playerColor : 'white',
          ...cleared,
          illegalAttempts: 0,
        }));
      },

      canPlayerMove: () => {
        const { outcome, turn } = get();
        if (outcome) return false;
        const color = playerColor();
        return color === null || color === turn;
      },

      isEngineTurn: () => {
        const { outcome, turn, mode: m } = get();
        return !outcome && m.kind === 'ai' && m.playerColor !== turn;
      },

      select: (square) => {
        const state = get();
        if (!state.canPlayerMove() || state.pendingPromotion) return 'ignored';
        if (state.selected && state.targets.some((t) => t.to === square)) {
          return state.tryMove(state.selected, square);
        }
        const piece = pieceAt(piecesFromFen(state.fen), square);
        if (piece && piece.color === state.turn && square !== state.selected) {
          set({ selected: square, targets: game.legalMoves(square), pendingPromotion: null });
        } else {
          set(cleared);
        }
        return 'ignored';
      },

      tryMove: (from, to) => {
        if (!get().canPlayerMove()) return 'ignored';
        const candidates = game.legalMoves(from).filter((m) => m.to === to);
        if (candidates.length === 0) {
          set((s) => ({ ...cleared, illegalAttempts: s.illegalAttempts + 1 }));
          return 'illegal';
        }
        if (candidates.some((m) => m.promotion)) {
          set({ selected: from, targets: [], pendingPromotion: { from, to } });
          return 'promotion';
        }
        return play({ from, to });
      },

      choosePromotion: (piece) => {
        const pending = get().pendingPromotion;
        if (!pending) return 'ignored';
        if (!piece) {
          set(cleared);
          return 'ignored';
        }
        return play({ ...pending, promotion: piece });
      },

      applyUci: (uci) => {
        const input = parseUci(uci);
        if (!input) return false;
        const result = game.move(input);
        if (!result.ok) return false;
        set({ ...snapshot(game), ...cleared });
        return true;
      },

      resign: () => {
        if (get().outcome) return;
        const loser = playerColor() ?? get().turn;
        game.end(resignOutcome(loser));
        set({ ...snapshot(game), ...cleared });
      },

      flip: () => set((s) => ({ orientation: opposite(s.orientation) })),
    };
  });
};

export type GameStoreApi = ReturnType<typeof createGameStore>;
