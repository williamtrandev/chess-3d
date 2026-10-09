import type { Landmark, PixelImage } from './photo-analysis';

/** MediaPipe WASM runtime, copied into public/ by scripts/copy-assets.mjs. */
const WASM_PATH = '/mediapipe';
/** Official MediaPipe pose model (full), fetched by the browser on first use. */
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
const MAX_SIDE = 1024;

export interface PoseResult {
  image: PixelImage;
  canvas: HTMLCanvasElement;
  landmarks: Landmark[];
  mask: Float32Array | null;
}

/** Draw the photo onto a canvas no larger than MAX_SIDE, so detection stays fast. */
const toCanvas = (source: HTMLImageElement): HTMLCanvasElement => {
  const scale = Math.min(1, MAX_SIDE / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.naturalWidth * scale);
  canvas.height = Math.round(source.naturalHeight * scale);
  canvas.getContext('2d')?.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
};

export const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh này.'));
    };
    image.src = url;
  });

/**
 * Finds one person's pose landmarks and silhouette in a photo, entirely in the browser.
 * Throws when no person is found.
 */
export const detectPose = async (photo: HTMLImageElement): Promise<PoseResult> => {
  const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
  const create = (delegate: 'GPU' | 'CPU') =>
    PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'IMAGE',
      numPoses: 1,
      outputSegmentationMasks: true,
    });
  const landmarker = await create('GPU').catch(() => create('CPU'));

  try {
    const canvas = toCanvas(photo);
    const result = landmarker.detect(canvas);
    const landmarks = result.landmarks[0];
    if (!landmarks)
      throw new Error('Không tìm thấy người trong ảnh. Hãy thử một ảnh toàn thân, rõ người hơn.');
    const maskImage = result.segmentationMasks?.[0];
    const mask = maskImage ? maskImage.getAsFloat32Array() : null;
    maskImage?.close();
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không hỗ trợ canvas.');
    const data = context.getImageData(0, 0, canvas.width, canvas.height);
    return {
      image: { width: data.width, height: data.height, data: data.data },
      canvas,
      landmarks,
      mask,
    };
  } finally {
    landmarker.close();
  }
};

/** Cut a square face crop with soft, transparent edges, for the character's head. */
export const cropFace = (
  canvas: HTMLCanvasElement,
  box: { x: number; y: number; size: number },
  out = 192,
): string => {
  const face = document.createElement('canvas');
  face.width = out;
  face.height = out;
  const context = face.getContext('2d');
  if (!context) return '';
  context.drawImage(canvas, box.x, box.y, box.size, box.size, 0, 0, out, out);
  const fade = context.createRadialGradient(
    out / 2,
    out / 2,
    out * 0.3,
    out / 2,
    out / 2,
    out * 0.5,
  );
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  context.globalCompositeOperation = 'destination-in';
  context.fillStyle = fade;
  context.fillRect(0, 0, out, out);
  return face.toDataURL('image/png');
};
