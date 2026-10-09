'use client';

import { useShallow } from 'zustand/react/shallow';
import { SCENERY_IDS, SCENERY_LABEL } from '@/lib/scenery';
import { useSettings } from '@/lib/settings-store';
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
    })),
  );

  return (
    <section className="glass space-y-4 p-4" aria-label="Cài đặt">
      <div>
        <p className="label mb-2">Khung cảnh</p>
        <div className="segmented">
          {SCENERY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={s.scenery === id}
              onClick={() => s.setScenery(id)}
              disabled={!webgl}
            >
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
