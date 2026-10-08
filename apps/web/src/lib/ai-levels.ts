export const AI_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type AiLevel = (typeof AI_LEVELS)[number];

export interface EngineSettings {
  /** Stockfish `Skill Level` option, 0–20. */
  skill: number;
  depth: number;
  moveTimeMs: number;
}

const SETTINGS: Record<AiLevel, EngineSettings> = {
  1: { skill: 0, depth: 1, moveTimeMs: 100 },
  2: { skill: 2, depth: 2, moveTimeMs: 150 },
  3: { skill: 4, depth: 3, moveTimeMs: 200 },
  4: { skill: 7, depth: 5, moveTimeMs: 300 },
  5: { skill: 10, depth: 8, moveTimeMs: 500 },
  6: { skill: 13, depth: 11, moveTimeMs: 800 },
  7: { skill: 16, depth: 15, moveTimeMs: 1200 },
  8: { skill: 20, depth: 20, moveTimeMs: 2000 },
};

export const engineSettings = (level: AiLevel): EngineSettings => SETTINGS[level];

export const isAiLevel = (value: number): value is AiLevel =>
  (AI_LEVELS as readonly number[]).includes(value);
