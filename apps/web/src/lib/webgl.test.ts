import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetWebGLProbe, supportsWebGL } from './webgl';

describe('supportsWebGL', () => {
  const loseContext = vi.fn();
  const getContext = vi.fn();

  beforeEach(() => {
    resetWebGLProbe();
    loseContext.mockReset();
    getContext.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext);
  });
  afterEach(() => vi.restoreAllMocks());

  it('probes once, caches the result and releases the probe context', () => {
    getContext.mockReturnValue({ getExtension: () => ({ loseContext }) });
    expect(supportsWebGL()).toBe(true);
    expect(supportsWebGL()).toBe(true);
    expect(supportsWebGL()).toBe(true);
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('reports no support when no context can be created', () => {
    getContext.mockReturnValue(null);
    expect(supportsWebGL()).toBe(false);
    expect(supportsWebGL()).toBe(false);
    expect(getContext).toHaveBeenCalledTimes(2); // webgl2, then webgl, once
  });
});
