import { describe, expect, it } from 'vitest';
import { createGameStore } from './game-store';

describe('game store', () => {
  it('selects a piece and lists its targets', () => {
    const store = createGameStore();
    store.getState().select('e2');
    expect(store.getState().selected).toBe('e2');
    expect(
      store
        .getState()
        .targets.map((t) => t.to)
        .sort(),
    ).toEqual(['e3', 'e4']);
  });

  it('ignores clicks on the opponent’s pieces and clears the selection', () => {
    const store = createGameStore();
    store.getState().select('e7');
    expect(store.getState().selected).toBeNull();
    store.getState().select('e2');
    store.getState().select('a5');
    expect(store.getState().selected).toBeNull();
  });

  it('moves by clicking a target square', () => {
    const store = createGameStore();
    store.getState().select('e2');
    expect(store.getState().select('e4')).toBe('moved');
    expect(store.getState().lastMove?.san).toBe('e4');
    expect(store.getState().turn).toBe('black');
    expect(store.getState().selected).toBeNull();
  });

  it('counts illegal drag attempts', () => {
    const store = createGameStore();
    expect(store.getState().tryMove('e2', 'e5')).toBe('illegal');
    expect(store.getState().illegalAttempts).toBe(1);
  });

  it('asks for a promotion piece before promoting', () => {
    const store = createGameStore();
    store.getState().newGame({ kind: 'local' }, '8/P7/8/8/8/8/k7/4K3 w - - 0 1');
    expect(store.getState().tryMove('a7', 'a8')).toBe('promotion');
    expect(store.getState().pendingPromotion).toEqual({ from: 'a7', to: 'a8' });
    expect(store.getState().select('e1')).toBe('ignored');
    expect(store.getState().choosePromotion('q')).toBe('moved');
    expect(store.getState().lastMove?.san).toBe('a8=Q+');
  });

  it('cancels a pending promotion', () => {
    const store = createGameStore();
    store.getState().newGame({ kind: 'local' }, '8/P7/8/8/8/8/k7/4K3 w - - 0 1');
    store.getState().tryMove('a7', 'a8');
    store.getState().choosePromotion(null);
    expect(store.getState().pendingPromotion).toBeNull();
    expect(store.getState().choosePromotion('q')).toBe('ignored');
  });

  describe('against the engine', () => {
    const vsAi = () => {
      const store = createGameStore();
      store.getState().newGame({ kind: 'ai', level: 3, playerColor: 'black' });
      return store;
    };

    it('orients the board to the player and waits for the engine', () => {
      const store = vsAi();
      expect(store.getState().orientation).toBe('black');
      expect(store.getState().isEngineTurn()).toBe(true);
      expect(store.getState().canPlayerMove()).toBe(false);
      expect(store.getState().select('e2')).toBe('ignored');
      expect(store.getState().tryMove('e2', 'e4')).toBe('ignored');
    });

    it('applies engine moves and hands the turn back', () => {
      const store = vsAi();
      expect(store.getState().applyUci('e2e4')).toBe(true);
      expect(store.getState().canPlayerMove()).toBe(true);
      expect(store.getState().applyUci('e2e4')).toBe(false);
      expect(store.getState().applyUci('garbage')).toBe(false);
    });

    it('records a resignation as a loss for the player', () => {
      const store = vsAi();
      store.getState().resign();
      expect(store.getState().outcome).toMatchObject({ winner: 'white', reason: 'resignation' });
      expect(store.getState().isEngineTurn()).toBe(false);
      store.getState().resign();
      expect(store.getState().outcome?.reason).toBe('resignation');
    });
  });

  it('detects checkmate and stops accepting moves', () => {
    const store = createGameStore();
    for (const uci of ['f2f3', 'e7e5', 'g2g4', 'd8h4']) store.getState().applyUci(uci);
    expect(store.getState().outcome?.reason).toBe('checkmate');
    expect(store.getState().isCheck).toBe(true);
    expect(store.getState().canPlayerMove()).toBe(false);
  });

  it('flips the board', () => {
    const store = createGameStore();
    store.getState().flip();
    expect(store.getState().orientation).toBe('black');
  });
});

describe('new game', () => {
  it('resets the position and bumps the game number', () => {
    const store = createGameStore();
    store.getState().applyUci('e2e4');
    store.getState().newGame({ kind: 'local' });
    expect(store.getState().moves).toHaveLength(0);
    expect(store.getState().gameNumber).toBe(1);
  });
});
