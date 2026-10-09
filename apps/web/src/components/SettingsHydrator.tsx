'use client';

import { useEffect } from 'react';
import { useSettings } from '@/lib/settings-store';

/** Loads saved settings from localStorage once the app has mounted. */
export function SettingsHydrator() {
  useEffect(() => {
    void useSettings.persist.rehydrate();
  }, []);
  return null;
}
