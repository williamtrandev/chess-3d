import { describe, expect, it } from 'vitest';
import { AI_LEVELS, engineSettings, isAiLevel } from './ai-levels';
import { parseBestMove, searchCommands } from './uci';

describe('uci', () => {
  it('parses bestmove lines', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestMove('bestmove e7e8q')).toBe('e7e8q');
    expect(parseBestMove('bestmove (none)')).toBeNull();
    expect(parseBestMove('info depth 3 score cp 20')).toBeNull();
  });

  it('builds search commands for a position', () => {
    const settings = engineSettings(3);
    expect(searchCommands('startfen', [], settings)).toEqual([
      'setoption name Skill Level value 4',
      'position fen startfen',
      'go depth 3 movetime 200',
    ]);
    expect(searchCommands('startfen', ['e2e4', 'e7e5'], settings)[1]).toBe(
      'position fen startfen moves e2e4 e7e5',
    );
  });

  it('gets stronger with each level', () => {
    const all = AI_LEVELS.map(engineSettings);
    all.slice(1).forEach((settings, i) => {
      const weaker = all[i];
      expect(settings.skill).toBeGreaterThan(weaker?.skill ?? Infinity);
      expect(settings.depth).toBeGreaterThan(weaker?.depth ?? Infinity);
    });
    expect(isAiLevel(8)).toBe(true);
    expect(isAiLevel(9)).toBe(false);
  });
});
