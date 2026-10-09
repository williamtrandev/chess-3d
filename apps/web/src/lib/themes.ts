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
  /**
   * Silhouette drawn around each side's pieces, contrasting with the piece itself so it
   * stays readable against any square, frame or scenery behind it.
   */
  outline: { white: string; black: string };
  /** Scene background color. */
  background: string;
  /** Strength of the bloom post-processing effect. */
  bloom: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  wood: {
    id: 'wood',
    label: 'Gỗ',
    lightSquare: '#d8b98e',
    darkSquare: '#9c6d47',
    frame: '#5a3a22',
    white: { color: '#fbf4e6', roughness: 0.45, metalness: 0.05 },
    black: { color: '#2e1c10', roughness: 0.4, metalness: 0.05 },
    outline: { white: '#2a1a0e', black: '#f6e7cc' },
    background: '#1c1410',
    bloom: 0.25,
  },
  marble: {
    id: 'marble',
    label: 'Cẩm thạch',
    lightSquare: '#c9d1d9',
    darkSquare: '#66727e',
    frame: '#2c333a',
    white: { color: '#fbfbfb', roughness: 0.15, metalness: 0.1 },
    black: { color: '#1a1f25', roughness: 0.12, metalness: 0.2 },
    outline: { white: '#1b2128', black: '#e9eef4' },
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
    outline: { white: '#02141a', black: '#1a0213' },
    background: '#04050c',
    bloom: 0.9,
  },
};
