import { describe, expect, it } from 'vitest';
import { TIME_CONTROLS, TIME_CONTROL_IDS, isTimeControlId } from './time-control.js';

describe('time controls', () => {
  it('defines the six supported formats with their category', () => {
    expect(TIME_CONTROL_IDS).toEqual(['1+0', '2+1', '3+2', '5+0', '10+0', '15+10']);
    expect(TIME_CONTROLS['15+10']).toEqual({
      id: '15+10',
      category: 'rapid',
      initialMs: 900_000,
      incrementMs: 10_000,
    });
    expect(TIME_CONTROLS['2+1'].category).toBe('bullet');
    expect(TIME_CONTROLS['5+0'].category).toBe('blitz');
  });

  it('validates ids', () => {
    expect(isTimeControlId('3+2')).toBe(true);
    expect(isTimeControlId('4+0')).toBe(false);
  });
});
