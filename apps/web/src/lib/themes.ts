export const THEME_IDS = ['wood', 'marble', 'neon', 'warriors'] as const;
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
  /** Draw chibi soldiers (with a rider for the knight) instead of chess pieces. */
  figures?: boolean;
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
    white: { color: '#f6ecda', roughness: 0.5, metalness: 0.05 },
    black: { color: '#2e1c10', roughness: 0.4, metalness: 0.05 },
    outline: { white: '#140b05', black: '#f6e7cc' },
    background: '#1c1410',
    bloom: 0.25,
  },
  marble: {
    id: 'marble',
    label: 'Cẩm thạch',
    lightSquare: '#c9d1d9',
    darkSquare: '#66727e',
    frame: '#2c333a',
    white: { color: '#eef0f3', roughness: 0.3, metalness: 0.1 },
    black: { color: '#1a1f25', roughness: 0.12, metalness: 0.2 },
    outline: { white: '#0d1116', black: '#e9eef4' },
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
  warriors: {
    id: 'warriors',
    label: 'Chiến binh',
    lightSquare: '#dccfae',
    darkSquare: '#8a7350',
    frame: '#4a3423',
    // Swatch colours for the picker; the figures carry their own palettes.
    white: { color: '#e3e8ef', roughness: 0.6, metalness: 0 },
    black: { color: '#3b404c', roughness: 0.6, metalness: 0 },
    outline: { white: '#140b05', black: '#f3e7cf' },
    background: '#1c1410',
    bloom: 0.25,
    figures: true,
  },
};
