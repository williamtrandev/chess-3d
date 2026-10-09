import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CameraView } from './camera-views';
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
  cameraView: CameraView;
  /** Draw the seated characters around the 3D table. */
  showPlayers: boolean;
  setTheme: (theme: ThemeId) => void;
  setScenery: (scenery: SceneryId) => void;
  setView: (view: ViewMode) => void;
  setQuality: (quality: Quality) => void;
  setCameraView: (view: CameraView) => void;
  togglePlayers: () => void;
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
      cameraView: 'player',
      showPlayers: true,
      setTheme: (theme) => set({ theme }),
      setScenery: (scenery) => set({ scenery }),
      setView: (view) => set({ view }),
      setQuality: (quality) => set({ quality }),
      setCameraView: (cameraView) => set({ cameraView }),
      togglePlayers: () => set((s) => ({ showPlayers: !s.showPlayers })),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
    }),
    {
      name: 'chess3d-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, scenery, view, sound, cameraView, showPlayers }) => ({
        theme,
        scenery,
        view,
        sound,
        cameraView,
        showPlayers,
      }),
      // Rehydrated after mount (see SettingsHydrator) so server and first client render match.
      skipHydration: true,
    },
  ),
);
