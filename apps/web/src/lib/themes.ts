export const THEME_IDS = ['wood', 'marble', 'neon'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface PieceMaterial {
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface Theme {
  id: ThemeId;
  label: string;
  lightSquare: string;
  darkSquare: string;
  frame: string;
  white: PieceMaterial;
  black: PieceMaterial;
  /** Scene background color. */
  background: string;
  /** Strength of the bloom post-processing effect. */
  bloom: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  wood: {
    id: 'wood',
    label: 'Gỗ',
    lightSquare: '#e8d0aa',
    darkSquare: '#a87a52',
    frame: '#5a3a22',
    white: { color: '#f3e6cf', roughness: 0.45, metalness: 0.05 },
    black: { color: '#3b2516', roughness: 0.4, metalness: 0.05 },
    background: '#1c1410',
    bloom: 0.25,
  },
  marble: {
    id: 'marble',
    label: 'Cẩm thạch',
    lightSquare: '#eef0f2',
    darkSquare: '#6e7a86',
    frame: '#2c333a',
    white: { color: '#fbfbfb', roughness: 0.15, metalness: 0.1 },
    black: { color: '#20262c', roughness: 0.12, metalness: 0.2 },
    background: '#12161a',
    bloom: 0.3,
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    lightSquare: '#1b2440',
    darkSquare: '#0b1022',
    frame: '#05070f',
    white: {
      color: '#7af0ff',
      roughness: 0.3,
      metalness: 0.6,
      emissive: '#14b8d4',
      emissiveIntensity: 0.6,
    },
    black: {
      color: '#ff5fd2',
      roughness: 0.3,
      metalness: 0.6,
      emissive: '#c0268f',
      emissiveIntensity: 0.6,
    },
    background: '#04050c',
    bloom: 0.9,
  },
};
