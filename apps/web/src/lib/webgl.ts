let supported: boolean | null = null;

/**
 * Whether the browser can create a WebGL context (needed for the 3D board).
 *
 * Probed once and cached: this runs as a `useSyncExternalStore` snapshot, i.e. on every
 * render, and browsers only keep ~16 live contexts before dropping the oldest one (which
 * would be the game's own canvas). The probe context is released straight away.
 */
export const supportsWebGL = (): boolean => {
  if (supported !== null) return supported;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    supported = Boolean(context);
  } catch {
    supported = false;
  }
  return supported;
};

/** Forget the cached probe result (tests only). */
export const resetWebGLProbe = () => {
  supported = null;
};
