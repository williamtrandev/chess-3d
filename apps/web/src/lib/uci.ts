import type { EngineSettings } from './ai-levels';

/** Commands that configure a search and start it for the given position. */
export const searchCommands = (
  startFen: string,
  uciMoves: readonly string[],
  settings: EngineSettings,
): string[] => [
  `setoption name Skill Level value ${settings.skill}`,
  `position fen ${startFen}${uciMoves.length ? ` moves ${uciMoves.join(' ')}` : ''}`,
  `go depth ${settings.depth} movetime ${settings.moveTimeMs}`,
];

/** Extract the move from a `bestmove e2e4 ponder e7e5` line. Null for other lines or `(none)`. */
export const parseBestMove = (line: string): string | null => {
  const match = /^bestmove\s+([a-h][1-8][a-h][1-8][qrbn]?)\b/.exec(line.trim());
  return match?.[1] ?? null;
};
