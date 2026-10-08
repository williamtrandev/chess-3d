import { z } from 'zod';
import { IdSchema, TimeCategorySchema } from '../primitives.js';
import { defineEvent } from './envelope.js';

export const RatingUpdatedV1 = defineEvent(
  'rating.updated',
  1,
  z.object({
    userId: IdSchema,
    gameId: IdSchema,
    category: TimeCategorySchema,
    before: z.number().int().positive(),
    after: z.number().int().positive(),
    gamesPlayed: z.number().int().positive(),
  }),
);

export type RatingUpdatedV1 = z.infer<typeof RatingUpdatedV1>;
