'use client';

import { useEffect, useState } from 'react';
import { engineSettings } from '@/lib/ai-levels';
import { StockfishEngine } from '@/lib/engine';
import type { GameStoreApi } from '@/lib/game-store';

/** Plays the engine's moves whenever it is its turn. Returns whether the engine is thinking. */
export const useEngineOpponent = (store: GameStoreApi): boolean => {
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    const engine = new StockfishEngine();
    let disposed = false;
    let requested: string | null = null;

    const maybeMove = () => {
      const state = store.getState();
      if (!state.isEngineTurn() || state.mode.kind !== 'ai') return;
      const token = `${state.gameNumber}:${state.moves.length}`;
      if (requested === token) return;
      requested = token;
      setThinking(true);
      const settings = engineSettings(state.mode.level);
      const started = performance.now();
      void engine
        .bestMove(
          state.startFen,
          state.moves.map((m) => m.uci),
          settings,
        )
        .then(async (uci) => {
          // Keep very fast replies from feeling instantaneous.
          const wait = 350 - (performance.now() - started);
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          if (disposed) return;
          const now = store.getState();
          if (uci && `${now.gameNumber}:${now.moves.length}` === token) now.applyUci(uci);
        })
        .finally(() => {
          if (!disposed && requested === token) setThinking(false);
        });
    };

    const unsubscribe = store.subscribe(maybeMove);
    maybeMove();
    return () => {
      disposed = true;
      unsubscribe();
      engine.dispose();
    };
  }, [store]);

  return thinking;
};
