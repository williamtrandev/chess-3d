'use client';

import { SCENERY_IDS, SCENERY_LABEL } from '@/lib/scenery';
import { useSettings } from '@/lib/settings-store';

const EMOJI = { field: '🌾', beach: '🏝️', studio: '🌙' } as const;

export function SceneryPicker() {
  const scenery = useSettings((s) => s.scenery);
  const setScenery = useSettings((s) => s.setScenery);
  return (
    <div className="glass inline-flex gap-1 rounded-2xl p-1" role="group" aria-label="Khung cảnh">
      {SCENERY_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-pressed={scenery === id}
          onClick={() => setScenery(id)}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition duration-200 ${
            scenery === id ? 'bg-white text-slate-900 shadow' : 'text-white/75 hover:text-white'
          }`}
        >
          <span className="mr-1.5">{EMOJI[id]}</span>
          {SCENERY_LABEL[id]}
        </button>
      ))}
    </div>
  );
}
