/** Whether the browser can create a WebGL context (needed for the 3D board). */
export const supportsWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};
