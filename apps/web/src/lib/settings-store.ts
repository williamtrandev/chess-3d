import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { SceneryId } from './scenery';
import type { ThemeId } from './themes';

export type ViewMode = '3d' | '2d';
export type Quality = 'high' | 'low';

interface SettingsState {
  theme: ThemeId;
  scenery: SceneryId;
  view: ViewMode;
  sound: boolean;
  /** Lowered automatically when the device struggles to keep a smooth frame rate. */
  quality: Quality;
  setTheme: (theme: ThemeId) => void;
  setScenery: (scenery: SceneryId) => void;
  setView: (view: ViewMode) => void;
  setQuality: (quality: Quality) => void;
  toggleSound: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'wood',
      scenery: 'field',
      view: '3d',
      sound: true,
      quality: 'high',
      setTheme: (theme) => set({ theme }),
      setScenery: (scenery) => set({ scenery }),
      setView: (view) => set({ view }),
      setQuality: (quality) => set({ quality }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
    }),
    {
      name: 'chess3d-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, scenery, view, sound }) => ({ theme, scenery, view, sound }),
      // Rehydrated after mount (see SettingsHydrator) so server and first client render match.
      skipHydration: true,
    },
  ),
);
