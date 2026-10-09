import { describe, expect, it } from 'vitest';
import { CAMERA_VIEWS, VIEW_PRESETS, nextView, type CameraView } from './camera-views';

describe('camera views', () => {
  it('cycles through every view', () => {
    let view: CameraView = 'player';
    const seen = new Set<string>();
    for (let i = 0; i < CAMERA_VIEWS.length; i++) {
      seen.add(view);
      view = nextView(view);
    }
    expect(seen.size).toBe(CAMERA_VIEWS.length);
    expect(view).toBe('player');
  });

  it('keeps every camera above the ground plane', () => {
    for (const preset of Object.values(VIEW_PRESETS)) {
      expect(preset.phi).toBeGreaterThan(0);
      expect(preset.phi).toBeLessThan(Math.PI / 2);
    }
  });

  it('hides the player’s own character in the first-person seat view', () => {
    expect(VIEW_PRESETS.seat.ownAvatar).toBe('hide');
  });
});
