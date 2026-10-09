import { describe, expect, it } from 'vitest';
import {
  createClock,
  flaggedSide,
  pressClock,
  remainingAt,
  startClock,
  stopClock,
} from './clock.js';
import { TIME_CONTROLS } from './time-control.js';

const blitz = TIME_CONTROLS['3+2'];

describe('clock', () => {
  it('starts stopped with the initial time on both sides', () => {
    const clock = createClock(blitz);
    expect(clock).toEqual({
      remainingMs: { white: 180_000, black: 180_000 },
      incrementMs: 2_000,
      running: null,
      turnStartedAt: null,
    });
    expect(remainingAt(clock, 'white', 999_999)).toBe(180_000);
    expect(flaggedSide(clock, 999_999)).toBeNull();
  });

  it('counts down only the running side', () => {
    const clock = startClock(createClock(blitz), 'white', 1_000);
    expect(remainingAt(clock, 'white', 11_000)).toBe(170_000);
    expect(remainingAt(clock, 'black', 11_000)).toBe(180_000);
  });

  it('ignores timestamps earlier than the turn start', () => {
    const clock = startClock(createClock(blitz), 'white', 5_000);
    expect(remainingAt(clock, 'white', 4_000)).toBe(180_000);
  });

  it('deducts elapsed time, adds increment and switches sides on press', () => {
    const started = startClock(createClock(blitz), 'white', 0);
    const pressed = pressClock(started, 10_000);
    expect(pressed.remainingMs).toEqual({ white: 172_000, black: 180_000 });
    expect(pressed.running).toBe('black');
    expect(pressed.turnStartedAt).toBe(10_000);
  });

  it('does nothing when pressing or stopping a stopped clock', () => {
    const clock = createClock(blitz);
    expect(pressClock(clock, 5_000)).toBe(clock);
    expect(stopClock(clock, 5_000)).toBe(clock);
  });

  it('reports the flagged side and never goes negative', () => {
    const clock = startClock(createClock(TIME_CONTROLS['1+0']), 'black', 0);
    expect(flaggedSide(clock, 59_999)).toBeNull();
    expect(flaggedSide(clock, 60_000)).toBe('black');
    expect(remainingAt(clock, 'black', 90_000)).toBe(0);
  });

  it('does not add increment to a player who moves after flagging', () => {
    const clock = startClock(createClock(blitz), 'white', 0);
    expect(pressClock(clock, 200_000).remainingMs.white).toBe(2_000);
  });

  it('freezes remaining time when stopped', () => {
    const stopped = stopClock(startClock(createClock(blitz), 'white', 0), 30_000);
    expect(stopped.running).toBeNull();
    expect(stopped.turnStartedAt).toBeNull();
    expect(remainingAt(stopped, 'white', 999_999)).toBe(150_000);
  });
});
