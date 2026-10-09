import type { Build, HairStyle } from './avatar';

/** A pose landmark in normalized image coordinates (MediaPipe Pose, 33 points). */
export interface Landmark {
  x: number;
  y: number;
  visibility?: number;
}

/** RGBA pixels, like `ImageData`. */
export interface PixelImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface FaceBox {
  x: number;
  y: number;
  size: number;
}

export interface BodyAnalysis {
  /** Colors as `#rrggbb`, or null when that part could not be seen. */
  skin: string | null;
  hair: string | null;
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  hairStyle: HairStyle;
  build: Build;
  face: FaceBox | null;
  warnings: string[];
}

// MediaPipe Pose landmark indices.
const P = {
  nose: 0,
  leftEye: 2,
  rightEye: 5,
  leftEar: 7,
  rightEar: 8,
  mouthLeft: 9,
  mouthRight: 10,
  leftShoulder: 11,
  rightShoulder: 12,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftHeel: 29,
  rightHeel: 30,
  leftFoot: 31,
  rightFoot: 32,
} as const;

type Rgb = [number, number, number];
interface Point {
  x: number;
  y: number;
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

export const colorDistance = (a: Rgb, b: Rgb): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Pixels in a box (pixel coordinates) that belong to the person, according to the mask. */
export const sampleBox = (
  image: PixelImage,
  mask: ArrayLike<number> | null,
  center: Point,
  halfWidth: number,
  halfHeight: number,
): Rgb[] => {
  const pixels: Rgb[] = [];
  const x0 = Math.max(0, Math.floor(center.x - halfWidth));
  const x1 = Math.min(image.width - 1, Math.ceil(center.x + halfWidth));
  const y0 = Math.max(0, Math.floor(center.y - halfHeight));
  const y1 = Math.min(image.height - 1, Math.ceil(center.y + halfHeight));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = y * image.width + x;
      if (mask && (mask[i] ?? 0) < 0.5) continue;
      pixels.push([image.data[i * 4] ?? 0, image.data[i * 4 + 1] ?? 0, image.data[i * 4 + 2] ?? 0]);
    }
  }
  return pixels;
};

/** Per-channel median, robust to stray pixels (patterns, shadows, background bleed). */
export const medianColor = (pixels: Rgb[]): Rgb | null => {
  if (pixels.length === 0) return null;
  const channel = (c: 0 | 1 | 2) => {
    const values = pixels.map((p) => p[c]).sort((a, b) => a - b);
    return values[Math.floor(values.length / 2)] ?? 0;
  };
  return [channel(0), channel(1), channel(2)];
};

/**
 * Reads skin, hair, clothing and shoe colors, a hair style guess, body build and a face
 * crop box from a full-body photo, given its pose landmarks and (optionally) a person mask.
 */
export const analyzeBody = (
  image: PixelImage,
  landmarks: readonly Landmark[],
  mask: ArrayLike<number> | null = null,
): BodyAnalysis => {
  const warnings: string[] = [];
  const at = (index: number): Point => {
    const l = landmarks[index];
    return { x: (l?.x ?? 0) * image.width, y: (l?.y ?? 0) * image.height };
  };
  const visible = (...indices: number[]) =>
    indices.every((i) => (landmarks[i]?.visibility ?? 1) >= 0.5);
  const colorOf = (boxes: [Point, number, number][]) =>
    medianColor(
      boxes.flatMap(([c, hw, hh]) => sampleBox(image, mask, c, Math.max(1, hw), Math.max(1, hh))),
    );

  const leftEye = at(P.leftEye);
  const rightEye = at(P.rightEye);
  const eyes = mid(leftEye, rightEye);
  const eyeDist = Math.max(4, dist(leftEye, rightEye));

  // Skin: cheeks, falling back to the wrists.
  let skin = colorOf([
    [mid(leftEye, at(P.mouthLeft)), eyeDist * 0.22, eyeDist * 0.18],
    [mid(rightEye, at(P.mouthRight)), eyeDist * 0.22, eyeDist * 0.18],
  ]);
  if (!skin && visible(P.leftWrist))
    skin = colorOf([[at(P.leftWrist), eyeDist * 0.25, eyeDist * 0.25]]);

  // Hair: just below the top of the head, found by walking up the mask from the eyes.
  let headTop = eyes.y - eyeDist * 1.9;
  if (mask) {
    const column = Math.round(at(P.nose).x);
    let y = Math.round(eyes.y);
    while (y > 0 && (mask[(y - 1) * image.width + column] ?? 0) >= 0.5) y--;
    headTop = Math.min(headTop + eyeDist * 0.6, y);
  }
  const hair = colorOf([
    [{ x: eyes.x, y: headTop + eyeDist * 0.35 }, eyeDist * 0.5, eyeDist * 0.22],
  ]);

  const leftShoulder = at(P.leftShoulder);
  const rightShoulder = at(P.rightShoulder);
  const shoulders = mid(leftShoulder, rightShoulder);
  const hips = mid(at(P.leftHip), at(P.rightHip));
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const hipWidth = Math.max(4, Math.abs(at(P.leftHip).x - at(P.rightHip).x));
  const torso = Math.max(4, dist(shoulders, hips));

  let hairStyle: HairStyle = 'short';
  if (skin && hair) {
    const contrast = colorDistance(skin, hair);
    if (contrast < 35) hairStyle = 'bald';
    else if (contrast < 60) hairStyle = 'buzz';
    else {
      // Long hair shows up beside the neck, between the ears and the shoulders.
      const besideNeck = colorOf([
        [lerp(at(P.leftEar), leftShoulder, 0.55), eyeDist * 0.2, eyeDist * 0.25],
        [lerp(at(P.rightEar), rightShoulder, 0.55), eyeDist * 0.2, eyeDist * 0.25],
      ]);
      if (besideNeck && colorDistance(besideNeck, hair) < 45) hairStyle = 'long';
    }
  }

  const top = colorOf([[lerp(shoulders, hips, 0.4), shoulderWidth * 0.25, torso * 0.15]]);

  let bottom: Rgb | null;
  if (visible(P.leftKnee, P.rightKnee)) {
    bottom = colorOf([
      [mid(at(P.leftHip), at(P.leftKnee)), hipWidth * 0.18, torso * 0.12],
      [mid(at(P.rightHip), at(P.rightKnee)), hipWidth * 0.18, torso * 0.12],
    ]);
  } else {
    warnings.push('Không thấy rõ chân, màu quần lấy gần hông.');
    bottom = colorOf([[{ x: hips.x, y: hips.y + torso * 0.15 }, hipWidth * 0.3, torso * 0.08]]);
  }

  let shoes: Rgb | null = null;
  if (visible(P.leftFoot, P.rightFoot)) {
    shoes = colorOf([
      [mid(at(P.leftHeel), at(P.leftFoot)), hipWidth * 0.12, hipWidth * 0.08],
      [mid(at(P.rightHeel), at(P.rightFoot)), hipWidth * 0.12, hipWidth * 0.08],
    ]);
  } else {
    warnings.push('Không thấy bàn chân, giữ nguyên màu giày.');
  }

  const ratio = shoulderWidth / torso;
  const build: Build = ratio < 0.62 ? 'slim' : ratio > 0.82 ? 'broad' : 'normal';

  const earDist = dist(at(P.leftEar), at(P.rightEar));
  const size = Math.min(image.width, image.height, Math.max(eyeDist * 2.8, earDist * 1.3));
  const center = lerp(eyes, at(P.nose), 0.4);
  const face: FaceBox | null =
    size >= 16
      ? {
          x: Math.max(0, Math.min(image.width - size, center.x - size / 2)),
          y: Math.max(0, Math.min(image.height - size, center.y - size / 2)),
          size,
        }
      : null;
  if (!face) warnings.push('Khuôn mặt quá nhỏ trong ảnh để cắt.');

  const hex = (c: Rgb | null) => (c ? toHex(c) : null);
  return {
    skin: hex(skin),
    hair: hex(hair),
    top: hex(top),
    bottom: hex(bottom),
    shoes: hex(shoes),
    hairStyle,
    build,
    face,
    warnings,
  };
};
