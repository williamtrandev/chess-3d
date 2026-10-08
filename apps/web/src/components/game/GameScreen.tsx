'use client';

import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GameOutcome } from '@chess3d/chess-core';
import { createGameStore, type GameMode } from '@/lib/game-store';
import { COLOR_LABEL, REASON_LABEL, outcomeTitle } from '@/lib/labels';
import { useSettings } from '@/lib/settings-store';
import { THEMES, THEME_IDS } from '@/lib/themes';
import { supportsWebGL } from '@/lib/webgl';
import { Board2D } from '../board/Board2D';
import { GameStoreContext, useGame, useGameStoreApi } from './game-context';
import { PromotionDialog } from './PromotionDialog';
import { useEngineOpponent } from './use-engine-opponent';
import { useGameSounds } from './use-game-sounds';

const Board3D = dynamic(() => import('../board/Board3D'), {
  ssr: false,
  loading: () => <BoardPlaceholder text="Đang dựng bàn cờ 3D…" />,
});

function BoardPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-zinc-900 text-sm text-zinc-400">
      {text}
    </div>
  );
}

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

  const { theme: themeId, view, sound, setTheme, setView, toggleSound } = useSettings();
  const theme = THEMES[themeId];
  const webgl = useWebGL();
  const use3D = view === '3d' && webgl;
  const [topDown, setTopDown] = useState(false);

  const mode = useGame((s) => s.mode);
  const turn = useGame((s) => s.turn);
  const outcome = useGame((s) => s.outcome);
  const pending = useGame((s) => s.pendingPromotion);
  const choosePromotion = useGame((s) => s.choosePromotion);
  const newGame = useGame((s) => s.newGame);
  const resign = useGame((s) => s.resign);
  const flip = useGame((s) => s.flip);
  const isCheck = useGame((s) => s.isCheck);

  const player = mode.kind === 'ai' ? mode.playerColor : null;
  // Remember which outcome was dismissed, so a new game's result shows again.
  const [dismissed, setDismissed] = useState<GameOutcome | null>(null);

  const status = outcome
    ? `${outcomeTitle(outcome, player)} · ${REASON_LABEL[outcome.reason]}`
    : thinking
      ? 'Máy đang suy nghĩ…'
      : `Lượt ${COLOR_LABEL[turn]}${isCheck ? ' · Chiếu!' : ''}`;

  return (
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          chess<span className="text-amber-400">3d</span>
        </Link>
        <span className="text-sm text-zinc-400">
          {mode.kind === 'ai' ? `Chơi với máy · cấp ${mode.level}` : 'Hai người một máy'}
        </span>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="relative mx-auto aspect-square w-full max-w-[min(100%,calc(100dvh-7rem))]">
          {use3D ? (
            <div className="h-full w-full overflow-hidden rounded-2xl">
              <Board3D theme={theme} topDown={topDown} />
            </div>
          ) : (
            <div className="p-[10px]">
              <Board2D theme={theme} />
            </div>
          )}
          {pending && <PromotionDialog color={turn} onChoose={choosePromotion} />}
          <AnimatePresence>
            {outcome && outcome !== dismissed && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-label="Kết quả ván"
                className="absolute inset-x-6 top-1/2 z-30 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-zinc-900/95 p-6 text-center shadow-2xl ring-1 ring-white/10 backdrop-blur"
              >
                <p className="text-3xl font-bold">{outcomeTitle(outcome, player)}</p>
                <p className="mt-1 text-zinc-400">{REASON_LABEL[outcome.reason]}</p>
                {outcome.result && (
                  <p className="mt-3 font-mono text-xl text-amber-400">{outcome.result}</p>
                )}
                <div className="mt-5 flex justify-center gap-2">
                  <button type="button" className="btn-primary" onClick={() => newGame(mode)}>
                    Chơi lại
                  </button>
                  <button type="button" className="btn" onClick={() => setDismissed(outcome)}>
                    Xem bàn cờ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="panel">
            <PlayerRow
              label={
                mode.kind === 'ai'
                  ? player === 'black'
                    ? 'Bạn'
                    : `Stockfish · cấp ${mode.level}`
                  : 'Đen'
              }
              color="black"
              active={!outcome && turn === 'black'}
            />
            <p className="my-3 rounded-lg bg-zinc-800/70 px-3 py-2 text-sm" aria-live="polite">
              {status}
            </p>
            <PlayerRow
              label={
                mode.kind === 'ai'
                  ? player === 'white'
                    ? 'Bạn'
                    : `Stockfish · cấp ${mode.level}`
                  : 'Trắng'
              }
              color="white"
              active={!outcome && turn === 'white'}
            />
          </div>

          <MoveList />

          <div className="panel grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => resign()}
              disabled={Boolean(outcome)}
            >
              Đầu hàng
            </button>
            <button type="button" className="btn" onClick={() => newGame(mode)}>
              Ván mới
            </button>
            <button type="button" className="btn" onClick={() => flip()}>
              Lật bàn
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setTopDown((v) => !v)}
              disabled={!use3D}
            >
              {topDown ? 'Góc nghiêng' : 'Nhìn từ trên'}
            </button>
          </div>

          <div className="panel flex flex-col gap-3 text-sm">
            <label className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Giao diện</span>
              <select
                value={themeId}
                onChange={(e) => setTheme(e.target.value as (typeof THEME_IDS)[number])}
                className="rounded-lg bg-zinc-800 px-2 py-1"
              >
                {THEME_IDS.map((id) => (
                  <option key={id} value={id}>
                    {THEMES[id].label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Hiển thị</span>
              <div className="flex gap-1">
                {(['3d', '2d'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    disabled={v === '3d' && !webgl}
                    className={`rounded-lg px-3 py-1 ${view === v ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800'}`}
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Âm thanh</span>
              <input
                type="checkbox"
                checked={sound}
                onChange={toggleSound}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
            {!webgl && (
              <p className="text-xs text-amber-300">
                Trình duyệt không hỗ trợ WebGL, đang dùng bàn cờ 2D.
              </p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

function PlayerRow({
  label,
  color,
  active,
}: {
  label: string;
  color: 'white' | 'black';
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`h-4 w-4 rounded-full ring-2 ${color === 'white' ? 'bg-zinc-100 ring-zinc-400' : 'bg-zinc-900 ring-zinc-500'}`}
      />
      <span className="font-medium">{label}</span>
      {active && (
        <span
          className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-400"
          aria-label="Đang tới lượt"
        />
      )}
    </div>
  );
}

function MoveList() {
  const moves = useGame((s) => s.moves);
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [moves.length]);

  const rows = Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => ({
    n: i + 1,
    white: moves[2 * i]?.san ?? '',
    black: moves[2 * i + 1]?.san,
  }));

  return (
    <div className="panel max-h-64 overflow-y-auto lg:max-h-80">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Nước đi</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có nước đi.</p>
      ) : (
        <ol className="grid grid-cols-[2.5rem_1fr_1fr] gap-y-1 font-mono text-sm">
          {rows.map((row) => (
            <li key={row.n} className="contents">
              <span className="text-zinc-500">{row.n}.</span>
              <span>{row.white}</span>
              <span>{row.black ?? ''}</span>
            </li>
          ))}
          <li ref={end} className="contents" />
        </ol>
      )}
    </div>
  );
}
