'use client';

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { GameStore, GameStoreApi } from '@/lib/game-store';

export const GameStoreContext = createContext<GameStoreApi | null>(null);

export const useGameStoreApi = (): GameStoreApi => {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error('useGame must be used inside <GameStoreContext.Provider>');
  return store;
};

/** Select a slice of the current game's state. */
export const useGame = <T,>(selector: (state: GameStore) => T): T =>
  useStore(useGameStoreApi(), selector);
