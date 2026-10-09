import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CameraView } from './camera-views';
import { GRAPHICS_LEVELS, lowerGraphics, type GraphicsLevel } from './graphics';
import type { SceneryId } from './scenery';
import type { ThemeId } from './themes';

export type ViewMode = '3d' | '2d';

interface SettingsState {
  theme: ThemeId;
  scenery: SceneryId;
  view: ViewMode;
  sound: boolean;
  /** Graphics level the player picked, or null to choose automatically. */
  graphics: GraphicsLevel | null;
  /**
   * Level used while on automatic: starts from the device's hints and is lowered for the
   * session when the frame rate cannot keep up. Not saved.
   */
  autoGraphics: GraphicsLevel | null;
  cameraView: CameraView;
  /** Draw the seated characters around the 3D table. */
  showPlayers: boolean;
  setTheme: (theme: ThemeId) => void;
  setScenery: (scenery: SceneryId) => void;
  setView: (view: ViewMode) => void;
  setGraphics: (graphics: GraphicsLevel | null) => void;
  setAutoGraphics: (graphics: GraphicsLevel) => void;
  /** Called when the frame rate drops: steps the automatic level down. */
  declineGraphics: () => void;
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
      graphics: null,
      autoGraphics: null,
      cameraView: 'player',
      showPlayers: true,
      setTheme: (theme) => set({ theme }),
      setScenery: (scenery) => set({ scenery }),
      setView: (view) => set({ view }),
      setGraphics: (graphics) => set({ graphics }),
      setAutoGraphics: (autoGraphics) => set({ autoGraphics }),
      declineGraphics: () =>
        set((s) =>
          s.graphics === null && s.autoGraphics
            ? { autoGraphics: lowerGraphics(s.autoGraphics) }
            : {},
        ),
      setCameraView: (cameraView) => set({ cameraView }),
      togglePlayers: () => set((s) => ({ showPlayers: !s.showPlayers })),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
    }),
    {
      name: 'chess3d-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme, scenery, view, sound, cameraView, showPlayers, graphics }) => ({
        theme,
        scenery,
        view,
        sound,
        cameraView,
        showPlayers,
        graphics,
      }),
      // Rehydrated after mount (see SettingsHydrator) so server and first client render match.
      skipHydration: true,
    },
  ),
);

/** The graphics level in effect: the player's pick, else the automatic one. */
export const useGraphicsLevel = (): GraphicsLevel =>
  useSettings((s) =>
    // Storage may hold a level this version does not know.
    s.graphics && GRAPHICS_LEVELS.includes(s.graphics)
      ? s.graphics
      : (s.autoGraphics ?? 'balanced'),
  );
