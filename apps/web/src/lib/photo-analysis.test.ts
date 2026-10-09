import { describe, expect, it } from 'vitest';
import {
  analyzeBody,
  medianColor,
  sampleBox,
  toHex,
  type Landmark,
  type PixelImage,
} from './photo-analysis';

const W = 200;
const H = 400;
const BACKGROUND = [0x33, 0x66, 0xcc] as const;

type Rect = [x0: number, y0: number, x1: number, y1: number, color: string];

/** A flat-colored "person" on a blue background, plus its person mask. */
const figure = (extra: Rect[] = []) => {
  const rects: Rect[] = [
    [78, 30, 122, 50, '#302010'], // hair
    [80, 50, 120, 96, '#e0b090'], // face
    [92, 96, 108, 110, '#e0b090'], // neck
    [70, 110, 130, 200, '#cc2222'], // shirt
    [75, 200, 125, 340, '#223355'], // trousers
    [70, 340, 130, 360, '#f0f0f0'], // shoes
    ...extra,
  ];
  const data = new Uint8ClampedArray(W * H * 4);
  const mask = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) data.set([...BACKGROUND, 255], i * 4);
  for (const [x0, y0, x1, y1, color] of rects) {
    const rgb = [1, 3, 5].map((o) => parseInt(color.slice(o, o + 2), 16));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        data.set([...rgb, 255], (y * W + x) * 4);
        mask[y * W + x] = 1;
      }
    }
  }
  return { image: { width: W, height: H, data } satisfies PixelImage, mask };
};

const px = (x: number, y: number, visibility = 1): Landmark => ({ x: x / W, y: y / H, visibility });

const landmarks = (): Landmark[] => {
  const l: Landmark[] = Array.from({ length: 33 }, () => px(0, 0, 0));
  const set = (i: number, x: number, y: number) => {
    l[i] = px(x, y);
  };
  set(0, 100, 80);
  set(2, 92, 70);
  set(5, 108, 70);
  set(7, 84, 72);
  set(8, 116, 72);
  set(9, 95, 88);
  set(10, 105, 88);
  set(11, 75, 110);
  set(12, 125, 110);
  set(15, 72, 190);
  set(16, 128, 190);
  set(23, 85, 200);
  set(24, 115, 200);
  set(25, 88, 270);
  set(26, 112, 270);
  set(29, 88, 348);
  set(30, 112, 348);
  set(31, 92, 352);
  set(32, 108, 352);
  return l;
};

describe('color helpers', () => {
  it('takes the median per channel', () => {
    expect(
      medianColor([
        [0, 0, 0],
        [10, 20, 30],
        [250, 250, 250],
      ]),
    ).toEqual([10, 20, 30]);
    expect(medianColor([])).toBeNull();
    expect(toHex([255, 16, 0])).toBe('#ff1000');
  });

  it('ignores pixels outside the image and outside the mask', () => {
    const { image, mask } = figure();
    expect(sampleBox(image, mask, { x: 5, y: 5 }, 10, 10)).toHaveLength(0);
    expect(sampleBox(image, null, { x: 0, y: 0 }, 2, 2)).toHaveLength(9);
  });
});

describe('analyzeBody', () => {
  it('reads the colors of every body part', () => {
    const { image, mask } = figure();
    const result = analyzeBody(image, landmarks(), mask);
    expect(result).toMatchObject({
      skin: '#e0b090',
      hair: '#302010',
      top: '#cc2222',
      bottom: '#223355',
      shoes: '#f0f0f0',
      hairStyle: 'short',
      build: 'slim',
    });
    expect(result.warnings).toEqual([]);
  });

  it('crops a square around the face', () => {
    const { image, mask } = figure();
    const { face } = analyzeBody(image, landmarks(), mask);
    if (!face) throw new Error('expected a face box');
    expect(face.size).toBeCloseTo(44.8);
    expect(face.x + face.size / 2).toBeCloseTo(100);
  });

  it('spots long hair falling beside the neck', () => {
    const { image, mask } = figure([
      [72, 50, 84, 112, '#302010'],
      [116, 50, 128, 112, '#302010'],
    ]);
    expect(analyzeBody(image, landmarks(), mask).hairStyle).toBe('long');
  });

  it('treats hair the color of skin as a shaved head', () => {
    const { image, mask } = figure([[78, 30, 122, 50, '#d8ac8c']]);
    expect(analyzeBody(image, landmarks(), mask).hairStyle).toBe('bald');
  });

  it('warns instead of guessing when the feet are hidden', () => {
    const { image, mask } = figure();
    const hidden = landmarks();
    hidden[31] = { x: 92 / W, y: 352 / H, visibility: 0.1 };
    const result = analyzeBody(image, hidden, mask);
    expect(result.shoes).toBeNull();
    expect(result.warnings).toHaveLength(1);
  });
});
