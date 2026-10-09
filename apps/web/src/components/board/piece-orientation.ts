import { squareCoords, type BoardPiece } from '@/lib/board';

/**
 * Knights look towards the centre files and slightly towards the opponent, so their
 * silhouette stays readable from the player's seat. The head's muzzle points to +X.
 */
export const knightRotation = (piece: BoardPiece): number => {
  const towardsRight = squareCoords(piece.square).file < 4;
  const tilt = Math.PI / 6;
  if (piece.color === 'white') return towardsRight ? tilt : Math.PI - tilt;
  return towardsRight ? -tilt : Math.PI + tilt;
};
