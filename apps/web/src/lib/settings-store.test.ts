import { beforeEach, describe, expect, it } from 'vitest';
import { useSettings } from './settings-store';

describe('settings store', () => {
  beforeEach(() => useSettings.setState({ cameraView: 'player', viewReset: 0 }));

  it('switches to a new camera view', () => {
    useSettings.getState().setCameraView('top');
    expect(useSettings.getState()).toMatchObject({ cameraView: 'top', viewReset: 0 });
  });

  it('resets the camera when the current view is picked again', () => {
    useSettings.getState().setCameraView('player');
    useSettings.getState().setCameraView('player');
    expect(useSettings.getState()).toMatchObject({ cameraView: 'player', viewReset: 2 });
  });
});
