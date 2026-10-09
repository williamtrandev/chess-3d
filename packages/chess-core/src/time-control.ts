export type TimeCategory = 'bullet' | 'blitz' | 'rapid';

export interface TimeControl {
  id: TimeControlId;
  category: TimeCategory;
  initialMs: number;
  incrementMs: number;
}

const define = <const T extends string>(
  id: T,
  category: TimeCategory,
  minutes: number,
  incrementSeconds: number,
) => ({ id, category, initialMs: minutes * 60_000, incrementMs: incrementSeconds * 1_000 });

const DEFINITIONS = [
  define('1+0', 'bullet', 1, 0),
  define('2+1', 'bullet', 2, 1),
  define('3+2', 'blitz', 3, 2),
  define('5+0', 'blitz', 5, 0),
  define('10+0', 'rapid', 10, 0),
  define('15+10', 'rapid', 15, 10),
] as const;

export type TimeControlId = (typeof DEFINITIONS)[number]['id'];

export const TIME_CONTROL_IDS: readonly TimeControlId[] = DEFINITIONS.map((d) => d.id);

export const TIME_CONTROLS: Readonly<Record<TimeControlId, TimeControl>> = Object.fromEntries(
  DEFINITIONS.map((d) => [d.id, d]),
) as Record<TimeControlId, TimeControl>;

export const isTimeControlId = (value: string): value is TimeControlId =>
  (TIME_CONTROL_IDS as readonly string[]).includes(value);
