'use client';

import { AnimatePresence } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { CAMERA_VIEW_LABEL, nextView } from '@/lib/camera-views';
import { COLOR_LABEL } from '@/lib/labels';
import { useShallow } from 'zustand/react/shallow';
import { createGameStore, type GameMode } from '@/lib/game-store';
import { useSettings } from '@/lib/settings-store';
import { THEMES } from '@/lib/themes';
import { supportsWebGL } from '@/lib/webgl';
import { Board2D } from '../board/Board2D';
import { StaticBackdrop } from '../scene/StaticBackdrop';
import { ArrowLeftIcon, CameraIcon, FlipIcon, MenuIcon, PanelIcon } from '../ui/icons';
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

const DESKTOP = '(min-width: 1024px)';
const subscribeDesktop = (onChange: () => void) => {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
/** Whether the side-panel layout applies (Tailwind's `lg`). */
const useDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );

function GameLayout() {
  const storeApi = useGameStoreApi();
  const thinking = useEngineOpponent(storeApi);
  useGameSounds(storeApi);

  const settings = useSettings(
    useShallow((s) => ({ theme: s.theme, scenery: s.scenery, view: s.view })),
  );
  const cameraView = useSettings((s) => s.cameraView);
  const setCameraView = useSettings((s) => s.setCameraView);
  const theme = THEMES[settings.theme];
  const webgl = useWebGL();
  const use3D = settings.view === '3d' && webgl;

  const mode = useGame((s) => s.mode);
  const turn = useGame((s) => s.turn);
  const pending = useGame((s) => s.pendingPromotion);
  const choosePromotion = useGame((s) => s.choosePromotion);
  const outcome = useGame((s) => s.outcome);
  const isCheck = useGame((s) => s.isCheck);
  const lastSan = useGame((s) => s.moves.at(-1)?.san);
  const flip = useGame((s) => s.flip);

  // Desktop: a side panel, shown by default and hidden for the full view.
  // Phone: the board fills the screen and the panels open as a bottom sheet.
  const desktop = useDesktop();
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const open = desktop ? panelOpen : sheetOpen;
  const toggle = () => (desktop ? setPanelOpen((o) => !o) : setSheetOpen((o) => !o));
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (event.key === 'h' || event.key === 'H') {
        if (window.matchMedia(DESKTOP).matches) setPanelOpen((o) => !o);
        else setSheetOpen((o) => !o);
      }
      if (event.key === 'Escape') setSheetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const sidePanel = desktop && panelOpen;
  const panelPadding = sidePanel ? 'lg:pr-[396px]' : '';

  const status = outcome
    ? 'Ván đã kết thúc'
    : thinking
      ? 'Máy đang nghĩ…'
      : `${isCheck ? 'Chiếu! ' : ''}Lượt ${COLOR_LABEL[turn]}`;
  const modeLabel = mode.kind === 'ai' ? `Chơi với máy · cấp ${mode.level}` : 'Hai người một máy';

  return (
    <main className="relative h-svh overflow-hidden bg-slate-950">
      <section className="absolute inset-0">
        <StaticBackdrop scenery={webgl ? settings.scenery : 'field'} />
        {webgl && (
          <div className="absolute inset-0">
            <GameCanvas
              theme={theme}
              scenery={settings.scenery}
              showBoard={use3D}
              interactive
              layout={sidePanel ? 'game' : 'full'}
            />
          </div>
        )}
        {!use3D && (
          <div
            className={`pointer-events-none absolute inset-0 flex items-center justify-center px-3 pb-24 pt-20 lg:p-4 lg:pt-20 ${panelPadding}`}
          >
            <div className="pointer-events-auto w-full max-w-[min(100%,calc(100svh-11rem),680px)]">
              <Board2D theme={theme} />
            </div>
          </div>
        )}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center justify-center p-4 pb-24 lg:pb-4 ${panelPadding}`}
        >
          <AnimatePresence>
            {pending && <PromotionDialog key="promotion" color={turn} onChoose={choosePromotion} />}
          </AnimatePresence>
          <ResultDialog />
        </div>
      </section>

      <header className="glass fixed left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl py-2 pl-2 pr-4 lg:left-4 lg:top-4 lg:pr-2">
        <Link
          href={mode.kind === 'ai' ? '/play/ai' : '/'}
          aria-label="Quay lại"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20"
        >
          <ArrowLeftIcon />
        </Link>
        <div className="min-w-0 leading-tight">
          <Link href="/" className="text-sm font-bold tracking-tight">
            chess<span className="text-amber-300">3d</span>
          </Link>
          <p className="truncate text-xs text-white/60">
            {desktop && !panelOpen ? status : modeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={!panelOpen}
          aria-label={panelOpen ? 'Ẩn bảng điều khiển để xem toàn cảnh' : 'Hiện bảng điều khiển'}
          title={panelOpen ? 'Xem toàn cảnh (phím H)' : 'Hiện bảng (phím H)'}
          className="ml-1 hidden h-9 w-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 lg:grid"
        >
          <PanelIcon open={panelOpen} />
        </button>
      </header>

      {/* Phone toolbar: game status and the controls needed while playing. */}
      <nav
        aria-label="Điều khiển ván cờ"
        className="glass fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 flex items-center gap-1.5 p-1.5 lg:hidden"
      >
        <div className="min-w-0 flex-1 pl-2.5 leading-tight">
          <p
            className={`truncate text-sm font-semibold ${isCheck && !outcome ? 'text-rose-200' : ''}`}
          >
            {status}
          </p>
          <p className="truncate text-xs text-white/55">
            {lastSan ? `Nước vừa đi: ${lastSan}` : 'Chưa có nước đi'}
          </p>
        </div>
        {use3D && (
          <ToolbarButton
            label={CAMERA_VIEW_LABEL[cameraView]}
            onClick={() => setCameraView(nextView(cameraView))}
          >
            <CameraIcon />
          </ToolbarButton>
        )}
        <ToolbarButton label="Lật bàn" onClick={() => flip()}>
          <FlipIcon />
        </ToolbarButton>
        <ToolbarButton label="Bảng" onClick={() => setSheetOpen(true)} accent>
          <MenuIcon />
        </ToolbarButton>
      </nav>

      {/* Tap outside the sheet to close it. */}
      <button
        type="button"
        aria-label="Đóng bảng"
        tabIndex={-1}
        onClick={() => setSheetOpen(false)}
        className={`fixed inset-0 z-20 bg-slate-950/40 transition-opacity duration-300 lg:hidden ${
          sheetOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-hidden={!open}
        inert={!open}
        className={`scrollbar-none fixed z-30 flex flex-col gap-3 overflow-y-auto transition duration-300 ease-out [&>*]:shrink-0 max-lg:inset-x-0 max-lg:bottom-0 max-lg:max-h-[82svh] max-lg:rounded-t-[28px] max-lg:bg-slate-950/90 max-lg:px-3 max-lg:pb-[max(1rem,env(safe-area-inset-bottom))] max-lg:shadow-2xl max-lg:backdrop-blur-xl lg:bottom-4 lg:right-4 lg:top-4 lg:w-[364px] ${
          sheetOpen ? '' : 'max-lg:pointer-events-none max-lg:translate-y-full'
        } ${panelOpen ? '' : 'lg:pointer-events-none lg:translate-x-[calc(100%+2rem)] lg:opacity-0'}`}
      >
        <div className="sticky top-0 z-10 -mx-3 flex justify-center bg-gradient-to-b from-slate-950 to-transparent pb-1 pt-2.5 lg:hidden">
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            aria-label="Đóng bảng"
            className="h-1.5 w-12 rounded-full bg-white/30"
          />
        </div>
        <PlayersPanel thinking={thinking} />
        <MoveList />
        <ActionBar />
        <ViewPicker enabled={webgl} />
        <SettingsPanel webgl={webgl} />
      </aside>
    </main>
  );
}

function ToolbarButton({
  label,
  onClick,
  accent = false,
  children,
}: {
  label: string;
  onClick: () => void;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-12 min-w-12 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-medium transition active:scale-95 ${
        accent ? 'bg-white text-slate-900' : 'bg-white/10 text-white/85'
      }`}
    >
      {children}
      <span className="max-w-16 truncate">{label}</span>
    </button>
  );
}
