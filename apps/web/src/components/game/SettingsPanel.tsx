'use client';

import { useShallow } from 'zustand/react/shallow';
import { SCENERY_EMOJI, SCENERY_IDS, SCENERY_LABEL } from '@/lib/scenery';
import { GRAPHICS_HINT, GRAPHICS_LABEL, GRAPHICS_LEVELS } from '@/lib/graphics';
import { useGraphicsLevel, useSettings } from '@/lib/settings-store';
import { THEMES, THEME_IDS } from '@/lib/themes';
import { SoundIcon } from '../ui/icons';

export function SettingsPanel({ webgl }: { webgl: boolean }) {
  const s = useSettings(
    useShallow((st) => ({
      theme: st.theme,
      scenery: st.scenery,
      view: st.view,
      sound: st.sound,
      setTheme: st.setTheme,
      setScenery: st.setScenery,
      setView: st.setView,
      toggleSound: st.toggleSound,
      graphics: st.graphics,
      setGraphics: st.setGraphics,
    })),
  );
  const level = useGraphicsLevel();

  return (
    <section className="glass space-y-4 p-4" aria-label="Cài đặt">
      <div>
        <p className="label mb-2">Khung cảnh</p>
        <div className="grid grid-cols-4 gap-1.5">
          {SCENERY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={s.scenery === id}
              onClick={() => s.setScenery(id)}
              disabled={!webgl}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-1 py-2 text-[10.5px] font-medium leading-tight transition duration-200 disabled:opacity-35 ${
                s.scenery === id
                  ? 'bg-white text-slate-900 shadow'
                  : 'bg-white/5 text-white/80 hover:bg-white/15'
              }`}
            >
              <span className="text-base leading-none">{SCENERY_EMOJI[id]}</span>
              {SCENERY_LABEL[id]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label mb-2">Bộ quân</p>
        <div className="segmented">
          {THEME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={s.theme === id}
              onClick={() => s.setTheme(id)}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <span className="flex">
                  <span
                    className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20"
                    style={{ background: THEMES[id].white.color }}
                  />
                  <span
                    className="-ml-1 h-2.5 w-2.5 rounded-full ring-1 ring-white/30"
                    style={{ background: THEMES[id].black.color }}
                  />
                </span>
                {THEMES[id].label}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="label mb-2">Đồ họa</p>
        <div className="grid grid-cols-4 gap-1.5">
          {([null, ...GRAPHICS_LEVELS] as const).map((option) => (
            <button
              key={option ?? 'auto'}
              type="button"
              aria-pressed={s.graphics === option}
              onClick={() => s.setGraphics(option)}
              disabled={!webgl}
              title={option ? GRAPHICS_HINT[option] : 'Tự chọn theo máy và tự giảm khi bị giật'}
              className={`rounded-2xl px-1 py-2 text-[11px] font-medium leading-tight transition duration-200 disabled:opacity-35 ${
                s.graphics === option
                  ? 'bg-white text-slate-900 shadow'
                  : 'bg-white/5 text-white/80 hover:bg-white/15'
              }`}
            >
              {option ? GRAPHICS_LABEL[option] : 'Tự động'}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-white/55">
          {s.graphics === null ? `Đang dùng: ${GRAPHICS_LABEL[level]}. ` : ''}
          {GRAPHICS_HINT[level]}. Máy rất yếu có thể chuyển sang bàn 2D.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="segmented flex-1">
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
        <button
          type="button"
          onClick={s.toggleSound}
          aria-pressed={s.sound}
          aria-label={s.sound ? 'Tắt âm thanh' : 'Bật âm thanh'}
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10 transition hover:bg-white/20"
        >
          <SoundIcon muted={!s.sound} />
        </button>
      </div>
      {!webgl && (
        <p className="text-xs text-amber-200">
          Trình duyệt không hỗ trợ WebGL, đang dùng bàn cờ 2D.
        </p>
      )}
    </section>
  );
}
