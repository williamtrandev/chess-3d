'use client';

import { AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createGameStore, type GameMode } from '@/lib/game-store';
import { useSettings } from '@/lib/settings-store';
import { THEMES } from '@/lib/themes';
import { supportsWebGL } from '@/lib/webgl';
import { Board2D } from '../board/Board2D';
import { StaticBackdrop } from '../scene/StaticBackdrop';
import { ArrowLeftIcon } from '../ui/icons';
import { ActionBar } from './ActionBar';
import { GameStoreContext, useGame, useGameStoreApi } from './game-context';
import { MoveList } from './MoveList';
import { PlayersPanel } from './PlayersPanel';
import { PromotionDialog } from './PromotionDialog';
import { ResultDialog } from './ResultDialog';
import { SettingsPanel } from './SettingsPanel';
import { useEngineOpponent } from './use-engine-opponent';
import { useGameSounds } from './use-game-sounds';

const GameCanvas = dynamic(() => import('../scene/GameCanvas'), { ssr: false });

const noop = () => () => {};
const useWebGL = () => useSyncExternalStore(noop, supportsWebGL, () => true);

export function GameScreen({ mode }: { mode: GameMode }) {
  // The page keys this component by mode, so the store never needs resetting from props.
  const [store] = useState(() => createGameStore(mode));
  useEffect(() => {
    // Handy for debugging and browser tests; stripped from production builds.
    if (process.env.NODE_ENV !== 'production') Object.assign(window, { __chess3dGame: store });
  }, [store]);

  return (
    <GameStoreContext.Provider value={store}>
      <GameLayout />
    </GameStoreContext.Provider>
  );
}

function GameLayout() {
  const storeApi = useGameStoreApi();
  const thinking = useEngineOpponent(storeApi);
  useGameSounds(storeApi);

  const settings = useSettings(
    useShallow((s) => ({ theme: s.theme, scenery: s.scenery, view: s.view, quality: s.quality })),
  );
  const theme = THEMES[settings.theme];
  const webgl = useWebGL();
  const use3D = settings.view === '3d' && webgl;
  const [topDown, setTopDown] = useState(false);

  const mode = useGame((s) => s.mode);
  const turn = useGame((s) => s.turn);
  const pending = useGame((s) => s.pendingPromotion);
  const choosePromotion = useGame((s) => s.choosePromotion);

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-slate-950 lg:h-svh lg:overflow-hidden">
      <section className="relative h-[64svh] min-h-[380px] w-full lg:absolute lg:inset-0 lg:h-full">
        <StaticBackdrop scenery={webgl ? settings.scenery : 'field'} />
        {webgl && (
          <div className="absolute inset-0">
            <GameCanvas
              theme={theme}
              scenery={settings.scenery}
              quality={settings.quality}
              showBoard={use3D}
              interactive
              topDown={topDown}
              layout="game"
            />
          </div>
        )}
        {!use3D && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 pt-20 lg:pr-[396px]">
            <div className="pointer-events-auto w-full max-w-[min(100%,calc(64svh-7rem),620px)] lg:max-w-[min(100%,calc(100svh-9rem),680px)]">
              <Board2D theme={theme} />
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 lg:pr-[396px]">
          <AnimatePresence>
            {pending && <PromotionDialog key="promotion" color={turn} onChoose={choosePromotion} />}
          </AnimatePresence>
          <ResultDialog />
        </div>
      </section>

      <header className="glass fixed left-4 top-4 z-20 flex items-center gap-3 rounded-2xl py-2 pl-2 pr-4">
        <Link
          href={mode.kind === 'ai' ? '/play/ai' : '/'}
          aria-label="Quay lại"
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="leading-tight">
          <Link href="/" className="text-sm font-bold tracking-tight">
            chess<span className="text-amber-300">3d</span>
          </Link>
          <p className="text-xs text-white/60">
            {mode.kind === 'ai' ? `Chơi với máy · cấp ${mode.level}` : 'Hai người một máy'}
          </p>
        </div>
      </header>

      <aside className="scrollbar-none relative z-10 mx-auto -mt-8 flex max-w-xl flex-col gap-3 px-4 pb-8 lg:fixed lg:bottom-4 lg:right-4 lg:top-4 lg:mt-0 lg:w-[364px] lg:max-w-none lg:overflow-y-auto lg:px-0 lg:pb-0">
        <PlayersPanel thinking={thinking} />
        <MoveList />
        <ActionBar topDown={topDown} onToggleTopDown={() => setTopDown((v) => !v)} can3D={use3D} />
        <SettingsPanel webgl={webgl} />
      </aside>
    </main>
  );
}
