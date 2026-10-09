'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CAMERA_VIEWS, CAMERA_VIEW_LABEL, nextView, type CameraView } from '@/lib/camera-views';
import { GRAPHICS_HINT, GRAPHICS_LABEL, GRAPHICS_LEVELS } from '@/lib/graphics';
import { SCENERY_EMOJI, SCENERY_IDS, SCENERY_LABEL } from '@/lib/scenery';
import { useGraphicsLevel, useSettings } from '@/lib/settings-store';
import { THEMES, THEME_IDS } from '@/lib/themes';
import { SoundIcon } from '../ui/icons';

const VIEW_ICON: Record<CameraView, string> = {
  player: '🎯',
  shoulder: '🧍',
  seat: '👀',
  side: '↔️',
  top: '⬇️',
  cinematic: '🎬',
};

const TABS = [
  { id: 'view', label: 'Góc nhìn', icon: '🎥' },
  { id: 'scene', label: 'Cảnh', icon: '🌸' },
  { id: 'board', label: 'Bàn cờ', icon: '♟️' },
  { id: 'system', label: 'Hệ thống', icon: '⚙️' },
] as const;
type Tab = (typeof TABS)[number]['id'];

/** A pressable tile: icon over a short label, white when selected. */
function Tile({
  active,
  disabled = false,
  onClick,
  icon,
  title,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon?: ReactNode;
  title?: string | undefined;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs font-medium leading-tight transition duration-200 disabled:pointer-events-none disabled:opacity-35 ${
        active ? 'bg-white text-slate-900 shadow' : 'bg-white/5 text-white/80 hover:bg-white/15'
      }`}
    >
      {icon && <span className="text-lg leading-none">{icon}</span>}
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      {children}
    </div>
  );
}

/**
 * Everything the player can tune during a game, grouped in tabs so the panel stays short
 * on a phone: camera views, scenery, board and pieces, and system options.
 */
export function GameSettings({ webgl }: { webgl: boolean }) {
  const [tab, setTab] = useState<Tab>('view');
  const s = useSettings(
    useShallow((st) => ({
      cameraView: st.cameraView,
      setCameraView: st.setCameraView,
      showPlayers: st.showPlayers,
      togglePlayers: st.togglePlayers,
      scenery: st.scenery,
      setScenery: st.setScenery,
      theme: st.theme,
      setTheme: st.setTheme,
      captureFx: st.captureFx,
      setCaptureFx: st.setCaptureFx,
      view: st.view,
      setView: st.setView,
      graphics: st.graphics,
      setGraphics: st.setGraphics,
      sound: st.sound,
      toggleSound: st.toggleSound,
    })),
  );
  const level = useGraphicsLevel();
  const use3D = webgl && s.view === '3d';

  // V cycles the camera views from anywhere on the page.
  useEffect(() => {
    if (!use3D) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      if (event.key === 'v' || event.key === 'V') {
        const { cameraView, setCameraView } = useSettings.getState();
        setCameraView(nextView(cameraView));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [use3D]);

  return (
    <section className="glass overflow-hidden p-0" aria-label="Cài đặt">
      <div role="tablist" aria-label="Nhóm cài đặt" className="grid grid-cols-4 gap-1 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-semibold transition duration-200 ${
              tab === t.id ? 'bg-white/15 text-white' : 'text-white/55 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Fixed minimum height so switching tabs never moves the tab bar under the finger. */}
      <div role="tabpanel" className="space-y-4 max-lg:min-h-[22rem] border-t border-white/10 p-4">
        {tab === 'view' && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              {CAMERA_VIEWS.map((id) => (
                <Tile
                  key={id}
                  active={s.cameraView === id}
                  disabled={!use3D}
                  onClick={() => s.setCameraView(id)}
                  icon={VIEW_ICON[id]}
                  title={s.cameraView === id ? 'Bấm lại để đưa camera về góc này' : undefined}
                >
                  {CAMERA_VIEW_LABEL[id]}
                </Tile>
              ))}
            </div>
            <p className="text-xs text-white/50">
              Kéo để xoay, cuộn hoặc chụm hai ngón để zoom. Bấm lại góc đang chọn để về góc chuẩn
              <span className="hidden lg:inline"> · phím V đổi góc</span>.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={s.showPlayers}
                onClick={s.togglePlayers}
                className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium ring-1 ring-white/10 transition ${
                  s.showPlayers
                    ? 'bg-emerald-400/20 text-emerald-100'
                    : 'bg-white/5 text-white/70 hover:bg-white/15'
                }`}
              >
                {s.showPlayers ? '🧑‍🤝‍🧑 Đang hiện người chơi' : '🧑‍🤝‍🧑 Hiện người chơi'}
              </button>
              <Link
                href="/avatar"
                className="rounded-2xl bg-white/10 px-3 py-2.5 text-sm font-medium ring-1 ring-white/10 transition hover:bg-white/20"
              >
                ✏️ Nhân vật
              </Link>
            </div>
          </>
        )}

        {tab === 'scene' && (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-3">
            {SCENERY_IDS.map((id) => (
              <Tile
                key={id}
                active={s.scenery === id}
                disabled={!webgl}
                onClick={() => s.setScenery(id)}
                icon={SCENERY_EMOJI[id]}
              >
                {SCENERY_LABEL[id]}
              </Tile>
            ))}
          </div>
        )}

        {tab === 'board' && (
          <>
            <Group label="Bộ quân">
              <div className="grid grid-cols-2 gap-1.5">
                {THEME_IDS.map((id) => (
                  <Tile
                    key={id}
                    active={s.theme === id}
                    onClick={() => s.setTheme(id)}
                    icon={
                      <span className="flex">
                        <span
                          className="h-3.5 w-3.5 rounded-full ring-1 ring-black/20"
                          style={{ background: THEMES[id].white.color }}
                        />
                        <span
                          className="-ml-1.5 h-3.5 w-3.5 rounded-full ring-1 ring-white/30"
                          style={{ background: THEMES[id].black.color }}
                        />
                      </span>
                    }
                  >
                    {THEMES[id].label}
                  </Tile>
                ))}
              </div>
            </Group>
            <Group label="Ăn quân">
              <div className="segmented">
                {(
                  [
                    ['cinematic', '🎬 Điện ảnh'],
                    ['simple', '⚡ Nhanh'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={s.captureFx === value}
                    onClick={() => s.setCaptureFx(value)}
                    disabled={!use3D}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Group>
            <Group label="Kiểu bàn">
              <div className="segmented">
                {(['3d', '2d'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={s.view === v}
                    onClick={() => s.setView(v)}
                    disabled={v === '3d' && !webgl}
                  >
                    Bàn {v.toUpperCase()}
                  </button>
                ))}
              </div>
            </Group>
          </>
        )}

        {tab === 'system' && (
          <>
            <Group label="Đồ họa">
              <div className="grid grid-cols-2 gap-1.5">
                {([null, ...GRAPHICS_LEVELS] as const).map((option) => (
                  <Tile
                    key={option ?? 'auto'}
                    active={s.graphics === option}
                    disabled={!webgl}
                    onClick={() => s.setGraphics(option)}
                  >
                    <span className="text-sm font-semibold">
                      {option ? GRAPHICS_LABEL[option] : 'Tự động'}
                    </span>
                    <span className="text-[11px] font-normal opacity-70">
                      {option ? GRAPHICS_HINT[option] : `Đang dùng: ${GRAPHICS_LABEL[level]}`}
                    </span>
                  </Tile>
                ))}
              </div>
              <p className="mt-2 text-xs text-white/50">Máy rất yếu có thể chuyển sang bàn 2D.</p>
            </Group>
            <button
              type="button"
              onClick={s.toggleSound}
              aria-pressed={s.sound}
              className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm font-medium ring-1 ring-white/10 transition hover:bg-white/15"
            >
              <span className="flex items-center gap-2">
                <SoundIcon muted={!s.sound} />
                Âm thanh
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  s.sound ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-white/60'
                }`}
              >
                {s.sound ? 'Bật' : 'Tắt'}
              </span>
            </button>
          </>
        )}

        {!webgl && (
          <p className="text-xs text-amber-200">
            Trình duyệt không hỗ trợ WebGL, đang dùng bàn cờ 2D.
          </p>
        )}
      </div>
    </section>
  );
}
