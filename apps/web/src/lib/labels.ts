import type { Color, EndReason, GameOutcome } from '@chess3d/chess-core';

export const COLOR_LABEL: Record<Color, string> = { white: 'Trắng', black: 'Đen' };

export const REASON_LABEL: Record<EndReason, string> = {
  checkmate: 'Chiếu hết',
  stalemate: 'Hết nước đi (stalemate)',
  insufficient_material: 'Không đủ quân chiếu hết',
  threefold_repetition: 'Lặp lại 3 lần',
  fifty_move_rule: 'Luật 50 nước',
  timeout: 'Hết giờ',
  timeout_vs_insufficient_material: 'Hết giờ nhưng đối thủ không đủ quân',
  resignation: 'Đầu hàng',
  draw_agreement: 'Hòa theo thỏa thuận',
  abandonment: 'Bỏ cuộc',
  aborted: 'Ván bị hủy',
};

/** Headline for the end-of-game dialog, from the point of view of `player` (null = neutral). */
export const outcomeTitle = (outcome: GameOutcome, player: Color | null): string => {
  if (outcome.reason === 'aborted') return 'Ván bị hủy';
  if (outcome.winner === null) return 'Hòa';
  if (player === null) return `${COLOR_LABEL[outcome.winner]} thắng`;
  return outcome.winner === player ? 'Bạn thắng!' : 'Bạn thua';
};
