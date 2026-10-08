import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ThemeId } from './themes';

export type ViewMode = '3d' | '2d';

interface SettingsState {
  theme: ThemeId;
  view: ViewMode;
  sound: boolean;
  setTheme: (theme: ThemeId) => void;
  setView: (view: ViewMode) => void;
  toggleSound: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'wood',
      view: '3d',
      sound: true,
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
    }),
    {
      name: 'chess3d-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, view, sound }) => ({ theme, view, sound }),
    },
  ),
);
