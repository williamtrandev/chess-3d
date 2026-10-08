import {
  COLORS,
  END_REASONS,
  GAME_RESULTS,
  PROMOTION_PIECES,
  TIME_CONTROL_IDS,
} from '@chess3d/chess-core';
import { z } from 'zod';

/** Identifiers for users and games are ULIDs. */
export const IdSchema = z.ulid();

export const ColorSchema = z.enum(COLORS);
export const SquareSchema = z.string().regex(/^[a-h][1-8]$/, 'Expected a square like e4');
export const UciMoveSchema = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/, 'Expected UCI');
export const PromotionSchema = z.enum(PROMOTION_PIECES);
export const TimeControlIdSchema = z.enum(TIME_CONTROL_IDS);
export const TimeCategorySchema = z.enum(['bullet', 'blitz', 'rapid']);
export const EndReasonSchema = z.enum(END_REASONS);
export const GameResultSchema = z.enum(GAME_RESULTS);

export const ClocksSchema = z.object({
  white: z.number().int().nonnegative(),
  black: z.number().int().nonnegative(),
});

export const PlayerRefSchema = z.object({
  id: IdSchema,
  name: z.string().min(1).max(32),
  isGuest: z.boolean(),
  rating: z.number().int().positive().optional(),
});
export type PlayerRef = z.infer<typeof PlayerRefSchema>;
