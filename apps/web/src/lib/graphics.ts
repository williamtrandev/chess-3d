export const GRAPHICS_LEVELS = ['high', 'balanced', 'eco'] as const;
export type GraphicsLevel = (typeof GRAPHICS_LEVELS)[number];

export const GRAPHICS_LABEL: Record<GraphicsLevel, string> = {
  high: 'Cao',
  balanced: 'Cân bằng',
  eco: 'Tiết kiệm',
};

export const GRAPHICS_HINT: Record<GraphicsLevel, string> = {
  high: 'Đẹp nhất, máy mạnh',
  balanced: 'Mượt, ít nóng máy',
  eco: 'Máy yếu, tiết kiệm pin',
};

/** Everything the 3D scene scales with the chosen graphics level. */
export interface GraphicsProfile {
  /** Device pixel ratio range for the canvas. */
  dpr: number | [number, number];
  /** Frames per second the scene is rendered at, at most. */
  fps: number;
  shadows: boolean;
  shadowMapSize: number;
  /** Bloom and vignette. */
  postprocessing: boolean;
  /** MSAA samples of the post-processing buffer. */
  multisampling: number;
  /** Density of particles and decorations in the scenery. */
  scenery: 'high' | 'low';
  /** Ink outlines around the seated characters. */
  characterOutlines: boolean;
}

export const GRAPHICS: Record<GraphicsLevel, GraphicsProfile> = {
  high: {
    dpr: [1, 1.75],
    fps: 60,
    shadows: true,
    shadowMapSize: 2048,
    postprocessing: true,
    multisampling: 4,
    scenery: 'high',
    characterOutlines: true,
  },
  balanced: {
    dpr: [1, 1.25],
    fps: 45,
    shadows: true,
    shadowMapSize: 1024,
    postprocessing: true,
    multisampling: 2,
    scenery: 'high',
    characterOutlines: true,
  },
  eco: {
    dpr: 1,
    fps: 30,
    shadows: false,
    shadowMapSize: 512,
    postprocessing: false,
    multisampling: 0,
    scenery: 'low',
    characterOutlines: false,
  },
};

/** The next level down, or the same level when already the lightest. */
export const lowerGraphics = (level: GraphicsLevel): GraphicsLevel =>
  GRAPHICS_LEVELS[Math.min(GRAPHICS_LEVELS.indexOf(level) + 1, GRAPHICS_LEVELS.length - 1)] ??
  'eco';

export interface DeviceHints {
  /** `navigator.hardwareConcurrency` */
  cores?: number | undefined;
  /** `navigator.deviceMemory` in GB (Chromium only). */
  memory?: number | undefined;
  /** Phone or tablet. */
  mobile: boolean;
}

/** Starting level before the player picks one: light for weak or mobile devices. */
export const detectGraphics = ({ cores, memory, mobile }: DeviceHints): GraphicsLevel => {
  if ((cores !== undefined && cores <= 4) || (memory !== undefined && memory <= 4)) return 'eco';
  if (mobile) return 'eco';
  return 'balanced';
};

/** Reads the device hints from the browser. */
export const browserDeviceHints = (): DeviceHints => {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    cores: nav.hardwareConcurrency || undefined,
    memory: nav.deviceMemory,
    mobile: window.matchMedia('(pointer: coarse)').matches,
  };
};
