'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { CAMERA_VIEWS, CAMERA_VIEW_LABEL, nextView, type CameraView } from '@/lib/camera-views';
import { useSettings } from '@/lib/settings-store';

const ICON: Record<CameraView, string> = {
  player: '🎯',
  shoulder: '🧍',
  seat: '👀',
  side: '↔️',
  top: '⬇️',
  cinematic: '🎬',
};

/** Camera view presets, the characters toggle and a link to the character editor. */
export function ViewPicker({ enabled }: { enabled: boolean }) {
  const view = useSettings((s) => s.cameraView);
  const setView = useSettings((s) => s.setCameraView);
  const showPlayers = useSettings((s) => s.showPlayers);
  const togglePlayers = useSettings((s) => s.togglePlayers);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (event.key === 'v' || event.key === 'V')
        setView(nextView(useSettings.getState().cameraView));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, setView]);

  return (
    <section className="glass p-4" aria-label="Góc nhìn">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="label">Góc nhìn</h2>
        <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">phím V</kbd>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {CAMERA_VIEWS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            disabled={!enabled}
            onClick={() => setView(id)}
            title={view === id ? 'Bấm lại để đưa camera về góc này' : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[11px] font-medium transition duration-200 disabled:pointer-events-none disabled:opacity-35 ${
              view === id
                ? 'bg-white text-slate-900 shadow'
                : 'bg-white/5 text-white/80 hover:bg-white/15'
            }`}
          >
            <span className="text-base leading-none">{ICON[id]}</span>
            {CAMERA_VIEW_LABEL[id]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-pressed={showPlayers}
          onClick={togglePlayers}
          className={`flex-1 rounded-2xl px-3 py-2 text-xs font-medium ring-1 ring-white/10 transition ${
            showPlayers
              ? 'bg-emerald-400/20 text-emerald-100'
              : 'bg-white/5 text-white/70 hover:bg-white/15'
          }`}
        >
          {showPlayers ? '🧑‍🤝‍🧑 Đang hiện người chơi' : '🧑‍🤝‍🧑 Hiện người chơi'}
        </button>
        <Link
          href="/avatar"
          className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-medium ring-1 ring-white/10 transition hover:bg-white/20"
        >
          ✏️ Nhân vật
        </Link>
      </div>
    </section>
  );
}
