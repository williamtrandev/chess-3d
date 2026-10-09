import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_AVATAR, sanitizeAvatar, type Avatar } from './avatar';

interface AvatarState {
  avatar: Avatar;
  setAvatar: (avatar: Avatar) => void;
  reset: () => void;
}

/** The player's own character, saved only in this browser. */
export const useMyAvatar = create<AvatarState>()(
  persist(
    (set) => ({
      avatar: DEFAULT_AVATAR,
      setAvatar: (avatar) => set({ avatar: sanitizeAvatar(avatar) }),
      reset: () => set({ avatar: DEFAULT_AVATAR }),
    }),
    {
      name: 'chess3d-avatar',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ avatar }) => ({ avatar }),
      merge: (persisted, current) => ({
        ...current,
        avatar: sanitizeAvatar((persisted as { avatar?: unknown } | undefined)?.avatar),
      }),
      skipHydration: true,
    },
  ),
);
