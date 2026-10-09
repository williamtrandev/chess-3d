'use client';

import { AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { COLOR_LABEL } from '@/lib/labels';
import { useShallow } from 'zustand/react/shallow';
import { createGameStore, type GameMode } from '@/lib/game-store';
import { useSettings } from '@/lib/settings-store';
import { THEMES } from '@/lib/themes';
import { supportsWebGL } from '@/lib/webgl';
import { Board2D } from '../board/Board2D';
import { StaticBackdrop } from '../scene/StaticBackdrop';
import { ArrowLeftIcon, PanelIcon } from '../ui/icons';
import { ActionBar } from './ActionBar';
import { GameStoreContext, useGame, useGameStoreApi } from './game-context';
import { MoveList } from './MoveList';
import { PlayersPanel } from './PlayersPanel';
import { PromotionDialog } from './PromotionDialog';
import { ResultDialog } from './ResultDialog';
import { SettingsPanel } from './SettingsPanel';
import { ViewPicker } from './ViewPicker';
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
    useShallow((s) => ({ theme: s.theme, scenery: s.scenery, view: s.view })),
  );
  const theme = THEMES[settings.theme];
  const webgl = useWebGL();
  const use3D = settings.view === '3d' && webgl;

  const mode = useGame((s) => s.mode);
  const turn = useGame((s) => s.turn);
  const pending = useGame((s) => s.pendingPromotion);
  const choosePromotion = useGame((s) => s.choosePromotion);
  const outcome = useGame((s) => s.outcome);

  // Hide the panels to take in the whole scene (button or the H key).
  const [hudHidden, setHudHidden] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (event.key === 'h' || event.key === 'H') setHudHidden((hidden) => !hidden);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const panelPadding = hudHidden ? '' : 'lg:pr-[396px]';

  return (
    <main className="relative min-h-svh overflow-x-hidden bg-slate-950 lg:h-svh lg:overflow-hidden">
      <section
        className={`relative w-full transition-[height] duration-300 lg:absolute lg:inset-0 lg:h-full ${
          hudHidden ? 'h-svh' : 'h-[64svh] min-h-[380px]'
        }`}
      >
        <StaticBackdrop scenery={webgl ? settings.scenery : 'field'} />
        {webgl && (
          <div className="absolute inset-0">
            <GameCanvas
              theme={theme}
              scenery={settings.scenery}
              showBoard={use3D}
              interactive
              layout={hudHidden ? 'full' : 'game'}
            />
          </div>
        )}
        {!use3D && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center p-4 pt-20 ${panelPadding}`}
          >
            <div className="pointer-events-auto w-full max-w-[min(100%,calc(64svh-7rem),620px)] lg:max-w-[min(100%,calc(100svh-9rem),680px)]">
              <Board2D theme={theme} />
            </div>
          </div>
        )}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center p-4 ${panelPadding}`}
        >
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
            {hudHidden
              ? outcome
                ? 'Ván đã kết thúc'
                : thinking
                  ? 'Máy đang nghĩ…'
                  : `Lượt ${COLOR_LABEL[turn]}`
              : mode.kind === 'ai'
                ? `Chơi với máy · cấp ${mode.level}`
                : 'Hai người một máy'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHudHidden((hidden) => !hidden)}
          aria-pressed={hudHidden}
          aria-label={hudHidden ? 'Hiện bảng điều khiển' : 'Ẩn bảng điều khiển để xem toàn cảnh'}
          title={hudHidden ? 'Hiện bảng (phím H)' : 'Xem toàn cảnh (phím H)'}
          className="ml-1 grid h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
        >
          <PanelIcon open={!hudHidden} />
        </button>
      </header>

      <aside
        aria-hidden={hudHidden}
        inert={hudHidden}
        className={`scrollbar-none relative z-10 mx-auto -mt-8 flex max-w-xl flex-col gap-3 px-4 pb-8 transition duration-300 ease-out lg:fixed lg:bottom-4 lg:right-4 lg:top-4 lg:mt-0 lg:w-[364px] lg:max-w-none lg:overflow-y-auto lg:px-0 lg:pb-0 [&>*]:shrink-0 ${
          hudHidden
            ? 'pointer-events-none max-lg:hidden lg:translate-x-[calc(100%+2rem)] lg:opacity-0'
            : ''
        }`}
      >
        <PlayersPanel thinking={thinking} />
        <MoveList />
        <ActionBar />
        <ViewPicker enabled={webgl} />
        <SettingsPanel webgl={webgl} />
      </aside>
    </main>
  );
}
