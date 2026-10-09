'use client';

import { useEffect } from 'react';
import { useMyAvatar } from '@/lib/avatar-store';
import { useSettings } from '@/lib/settings-store';

/** Loads saved settings and the player's character from localStorage once mounted. */
export function SettingsHydrator() {
  useEffect(() => {
    void useSettings.persist.rehydrate();
    void useMyAvatar.persist.rehydrate();
  }, []);
  return null;
}
