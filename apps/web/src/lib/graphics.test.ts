import { describe, expect, it } from 'vitest';
import { GRAPHICS, detectGraphics, lowerGraphics } from './graphics';

describe('detectGraphics', () => {
  it('picks the light level for weak or mobile devices', () => {
    expect(detectGraphics({ cores: 4, memory: 8, mobile: false })).toBe('eco');
    expect(detectGraphics({ cores: 8, memory: 4, mobile: false })).toBe('eco');
    expect(detectGraphics({ cores: 8, memory: 8, mobile: true })).toBe('eco');
  });

  it('picks the balanced level otherwise, even without hints', () => {
    expect(detectGraphics({ cores: 10, memory: 16, mobile: false })).toBe('balanced');
    expect(detectGraphics({ mobile: false })).toBe('balanced');
  });
});

describe('lowerGraphics', () => {
  it('steps down one level and stops at the lightest', () => {
    expect(lowerGraphics('high')).toBe('balanced');
    expect(lowerGraphics('balanced')).toBe('eco');
    expect(lowerGraphics('eco')).toBe('eco');
  });
});

describe('GRAPHICS', () => {
  it('gets cheaper with each level', () => {
    const { high, balanced, eco } = GRAPHICS;
    const maxDpr = (dpr: number | [number, number]) => (Array.isArray(dpr) ? dpr[1] : dpr);
    expect(maxDpr(high.dpr)).toBeGreaterThan(maxDpr(balanced.dpr));
    expect(maxDpr(balanced.dpr)).toBeGreaterThan(maxDpr(eco.dpr));
    expect(high.fps).toBeGreaterThan(balanced.fps);
    expect(balanced.fps).toBeGreaterThan(eco.fps);
    expect(eco).toMatchObject({ shadows: false, postprocessing: false });
  });
});
