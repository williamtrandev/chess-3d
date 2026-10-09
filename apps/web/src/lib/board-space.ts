import { Vector3 } from 'three';
import { squareCoords } from './board';

/** World position of a square's centre on the board surface (white at +Z). */
export const squareToVector = (square: string, y = 0): Vector3 => {
  const { file, rank } = squareCoords(square);
  return new Vector3(file - 3.5, y, 3.5 - rank);
};

/** Square under a point on the board surface, or null when outside the board. */
export const vectorToSquare = (point: Vector3): string | null => {
  const file = Math.floor(point.x + 4);
  const rank = Math.floor(4 - point.z);
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${'abcdefgh'[file]}${rank + 1}`;
};

/** Top of the table the board rests on. */
export const TABLE_TOP_Y = -0.41;
export const TABLE_HALF = 5.3;

/** Characters are modelled at chibi scale and enlarged by this factor. */
export const CHARACTER_SCALE = 1.8;
/** Height of a chair seat (character origin) and its distance from the board centre. */
export const SEAT_Y = -2.69;
export const SEAT_Z = 7.6;
