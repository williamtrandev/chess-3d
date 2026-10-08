'use client';

import { useEffect } from 'react';
import type { GameStoreApi } from '@/lib/game-store';
import { playSound } from '@/lib/sound';
import { useSettings } from '@/lib/settings-store';

/** Plays a sound for every move, check, illegal attempt, game start and end. */
export const useGameSounds = (store: GameStoreApi): void => {
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (!useSettings.getState().sound) return;
        if (state.gameNumber !== previous.gameNumber) return playSound('gameStart');
        if (state.outcome && !previous.outcome) return playSound('gameEnd');
        if (state.lastMove && state.lastMove !== previous.lastMove) {
          if (state.lastMove.check) return playSound('check');
          return playSound(state.lastMove.captured ? 'capture' : 'move');
        }
        if (state.illegalAttempts > previous.illegalAttempts) playSound('illegal');
      }),
    [store],
  );
};
