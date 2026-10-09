export const CAMERA_VIEWS = ['player', 'shoulder', 'seat', 'side', 'top', 'cinematic'] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];

export const CAMERA_VIEW_LABEL: Record<CameraView, string> = {
  player: 'Mặc định',
  shoulder: 'Qua vai',
  seat: 'Góc ngồi',
  side: 'Cạnh bàn',
  top: 'Trên cao',
  cinematic: 'Điện ảnh',
};

/** How the player's own character is drawn from a given view. */
export type OwnAvatarMode = 'show' | 'fade' | 'hide';

export interface ViewPreset {
  /** Distance from the board centre, before scaling for narrow screens. */
  radius: number;
  /** Angle from straight up, in radians. */
  phi: number;
  /** Rotation around the board relative to the player's side, in radians. */
  theta: number;
  /** Fraction of the screen height the board is pushed down to show more sky. */
  lift: number;
  autoRotate: boolean;
  ownAvatar: OwnAvatarMode;
}

export const VIEW_PRESETS: Record<CameraView, ViewPreset> = {
  // Diagonal from behind the player's right shoulder: the whole board stays readable and
  // the files and ranks don't line up into a flat grid.
  player: {
    radius: 15,
    phi: 0.92,
    theta: 0.7,
    lift: 0.12,
    autoRotate: false,
    ownAvatar: 'fade',
  },
  shoulder: {
    radius: 12.5,
    phi: 1.16,
    theta: 0.42,
    lift: 0.12,
    autoRotate: false,
    ownAvatar: 'show',
  },
  seat: { radius: 7.4, phi: 1.2, theta: 0, lift: 0.04, autoRotate: false, ownAvatar: 'hide' },
  side: {
    radius: 18,
    phi: 1.12,
    theta: Math.PI / 2,
    lift: 0.14,
    autoRotate: false,
    ownAvatar: 'show',
  },
  top: { radius: 12.5, phi: 0.0001, theta: 0, lift: 0.02, autoRotate: false, ownAvatar: 'show' },
  cinematic: { radius: 19, phi: 1.08, theta: 0.6, lift: 0.14, autoRotate: true, ownAvatar: 'show' },
};

/** Next view in the cycle, for the keyboard shortcut. */
export const nextView = (view: CameraView): CameraView =>
  CAMERA_VIEWS[(CAMERA_VIEWS.indexOf(view) + 1) % CAMERA_VIEWS.length] ?? 'player';
