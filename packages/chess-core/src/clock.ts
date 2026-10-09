import type { TimeControl } from './time-control.js';
import { opposite, type Color } from './types.js';

/**
 * Immutable chess clock driven by timestamps supplied by the caller (server time).
 * Uses Fischer increment: the increment is added after the player completes a move.
 */
export interface ClockState {
  remainingMs: Record<Color, number>;
  incrementMs: number;
  /** Side whose clock is running, or null when stopped. */
  running: Color | null;
  /** Timestamp (ms) at which the running side's turn started. */
  turnStartedAt: number | null;
}

export const createClock = (timeControl: TimeControl): ClockState => ({
  remainingMs: { white: timeControl.initialMs, black: timeControl.initialMs },
  incrementMs: timeControl.incrementMs,
  running: null,
  turnStartedAt: null,
});

/** Start (or restart) the given side's clock at `now`. */
export const startClock = (clock: ClockState, side: Color, now: number): ClockState => ({
  ...clock,
  running: side,
  turnStartedAt: now,
});

/** Remaining time for `side` at `now`, never negative. */
export const remainingAt = (clock: ClockState, side: Color, now: number): number => {
  const stored = clock.remainingMs[side];
  if (clock.running !== side || clock.turnStartedAt === null) return stored;
  return Math.max(0, stored - Math.max(0, now - clock.turnStartedAt));
};

/** Side whose flag has fallen at `now`, if any. */
export const flaggedSide = (clock: ClockState, now: number): Color | null =>
  clock.running !== null && remainingAt(clock, clock.running, now) === 0 ? clock.running : null;

/**
 * The running side completed a move at `now`: deduct elapsed time, add increment
 * and start the opponent's clock. A clock that is not running is returned unchanged.
 */
export const pressClock = (clock: ClockState, now: number): ClockState => {
  const side = clock.running;
  if (side === null) return clock;
  const left = remainingAt(clock, side, now);
  return {
    ...clock,
    remainingMs: { ...clock.remainingMs, [side]: left + clock.incrementMs },
    running: opposite(side),
    turnStartedAt: now,
  };
};

/** Freeze both clocks at `now` (game over or paused). */
export const stopClock = (clock: ClockState, now: number): ClockState => {
  const side = clock.running;
  if (side === null) return clock;
  return {
    ...clock,
    remainingMs: { ...clock.remainingMs, [side]: remainingAt(clock, side, now) },
    running: null,
    turnStartedAt: null,
  };
};
