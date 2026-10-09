'use client';

import dynamic from 'next/dynamic';
import { useState, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createGameStore } from '@/lib/game-store';
import { useSettings } from '@/lib/settings-store';
import { THEMES } from '@/lib/themes';
import { supportsWebGL } from '@/lib/webgl';
import { GameStoreContext } from '../game/game-context';
import { StaticBackdrop } from './StaticBackdrop';

const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false });

const noop = () => () => {};

/** Full-screen living scenery with a slowly turning board, behind the menu pages. */
export function SceneBackdrop() {
  const [store] = useState(() => createGameStore());
  const webgl = useSyncExternalStore(noop, supportsWebGL, () => false);
  const { theme, scenery } = useSettings(
    useShallow((s) => ({ theme: s.theme, scenery: s.scenery })),
  );

  return (
    <div className="fixed inset-0">
      <StaticBackdrop scenery={scenery} />
      {webgl && (
        <GameStoreContext.Provider value={store}>
          <div className="absolute inset-0">
            <GameCanvas
              theme={THEMES[theme]}
              scenery={scenery}
              showBoard
              interactive={false}
              layout="home"
            />
          </div>
        </GameStoreContext.Provider>
      )}
      {/* Keeps the text readable over a bright sky. */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/25 to-transparent" />
    </div>
  );
}
