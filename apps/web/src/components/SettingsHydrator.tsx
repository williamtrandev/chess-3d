'use client';

import { useEffect } from 'react';
import { useMyAvatar } from '@/lib/avatar-store';
import { browserDeviceHints, detectGraphics } from '@/lib/graphics';
import { useSettings } from '@/lib/settings-store';

/**
 * Loads saved settings and the player's character from localStorage once mounted, and
 * picks the automatic graphics level from the device.
 */
export function SettingsHydrator() {
  useEffect(() => {
    void useSettings.persist.rehydrate();
    useSettings.getState().setAutoGraphics(detectGraphics(browserDeviceHints()));
    void useMyAvatar.persist.rehydrate();
  }, []);
  return null;
}
