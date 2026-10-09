export const SCENERY_IDS = [
  'field',
  'sunset',
  'beach',
  'snow',
  'night',
  'sakura',
  'studio',
] as const;
export type SceneryId = (typeof SCENERY_IDS)[number];

/** Wood of the table and chairs in each scene. */
export const TABLE_WOOD: Record<SceneryId, string> = {
  field: '#7a5232',
  sunset: '#6e4528',
  beach: '#d8c4a0',
  snow: '#5b3b26',
  night: '#4a3222',
  sakura: '#6b3f2a',
  studio: '#3b2a1e',
};

export const SCENERY_LABEL: Record<SceneryId, string> = {
  field: 'Đồng quê',
  sunset: 'Hoàng hôn',
  beach: 'Bãi biển',
  snow: 'Núi tuyết',
  night: 'Đêm lồng đèn',
  sakura: 'Vườn anh đào',
  studio: 'Phòng tối',
};

export const SCENERY_EMOJI: Record<SceneryId, string> = {
  field: '🌾',
  sunset: '🌅',
  beach: '🏝️',
  snow: '🏔️',
  night: '🏮',
  sakura: '🌸',
  studio: '🌙',
};

/** Height of the ground under the table, in board units (the board surface is y = 0). */
export const GROUND_Y = -5.6;

/** Deterministic pseudo-random number in [0, 1) for an integer seed. */
export const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Seeded generator for placing scenery the same way on every render. */
export const seededRandom = (seed: number) => {
  let i = seed;
  return () => hash((i += 1));
};

const smooth = (t: number) => t * t * (3 - 2 * t);

/** 2D value noise in [0, 1]. */
export const noise2 = (x: number, y: number): number => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const corner = (dx: number, dy: number) => hash((xi + dx) * 157 + (yi + dy) * 113);
  const top = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * xf;
  const bottom = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * xf;
  return top + (bottom - top) * yf;
};

/** Fractal noise: a few octaves of value noise, in roughly [0, 1]. */
export const fbm = (x: number, y: number, octaves = 4): number => {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2(x * frequency, y * frequency);
    frequency *= 2;
    amplitude *= 0.5;
  }
  return value / (1 - 0.5 ** octaves);
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smoothstep = (a: number, b: number, t: number) => smooth(clamp01((t - a) / (b - a)));

/** Meadow height: flat around the table, rolling hills further out. */
export const fieldHeight = (x: number, z: number): number => {
  const distance = Math.hypot(x, z);
  const hills = fbm(x * 0.02, z * 0.02) * 6.5 - 2;
  const ripples = (fbm(x * 0.12 + 40, z * 0.12) - 0.5) * 0.6;
  return GROUND_Y + smoothstep(20, 90, distance) * hills + smoothstep(11, 18, distance) * ripples;
};

export const ISLAND_RADIUS = 34;
export const WATER_Y = GROUND_Y - 0.55;

/** Sandy island: gentle dunes inland, sloping under the water past the shoreline. */
export const beachHeight = (x: number, z: number): number => {
  const distance = Math.hypot(x, z);
  const angle = Math.atan2(z, x);
  const coast =
    ISLAND_RADIUS + (noise2(Math.cos(angle) * 2 + 5, Math.sin(angle) * 2 + 5) - 0.5) * 10;
  const dunes = smoothstep(9, 22, distance) * fbm(x * 0.06, z * 0.06, 3) * 1.6;
  const slope = smoothstep(coast - 10, coast + 14, distance) * 7;
  return GROUND_Y + dunes - slope;
};

/** Snowy valley: gentle drifts near the table, tall mountains on the horizon. */
export const snowHeight = (x: number, z: number): number => {
  const distance = Math.hypot(x, z);
  const drifts = (fbm(x * 0.05, z * 0.05, 3) - 0.4) * 3;
  const mountains = fbm(x * 0.012 + 3, z * 0.012 - 7, 5) * 70;
  return (
    GROUND_Y + smoothstep(14, 50, distance) * drifts + smoothstep(70, 180, distance) * mountains
  );
};

/** Garden ground: flat around the table, soft mounds further out. */
export const gardenHeight = (x: number, z: number): number => {
  const distance = Math.hypot(x, z);
  return GROUND_Y + smoothstep(26, 90, distance) * (fbm(x * 0.03, z * 0.03, 3) * 9 - 3);
};
