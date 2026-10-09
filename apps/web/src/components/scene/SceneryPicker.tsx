'use client';

import { SCENERY_EMOJI, SCENERY_IDS, SCENERY_LABEL } from '@/lib/scenery';
import { useSettings } from '@/lib/settings-store';

/** Compact scene switcher: emoji buttons, with the name shown for the current scene. */
export function SceneryPicker() {
  const scenery = useSettings((s) => s.scenery);
  const setScenery = useSettings((s) => s.setScenery);
  return (
    <div
      className="glass inline-flex flex-wrap justify-end gap-1 rounded-2xl p-1"
      role="group"
      aria-label="Khung cảnh"
    >
      {SCENERY_IDS.map((id) => {
        const active = scenery === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            aria-label={SCENERY_LABEL[id]}
            title={SCENERY_LABEL[id]}
            onClick={() => setScenery(id)}
            className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-300 ${
              active ? 'bg-white text-slate-900 shadow' : 'text-white/80 hover:bg-white/15'
            }`}
          >
            <span>{SCENERY_EMOJI[id]}</span>
            {active && <span className="ml-1.5">{SCENERY_LABEL[id]}</span>}
          </button>
        );
      })}
    </div>
  );
}
