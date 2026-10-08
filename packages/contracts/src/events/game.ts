import { z } from 'zod';
import {
  ColorSchema,
  EndReasonSchema,
  GameResultSchema,
  IdSchema,
  PlayerRefSchema,
  TimeCategorySchema,
  TimeControlIdSchema,
} from '../primitives.js';
import { defineEvent } from './envelope.js';

export const GameStartedV1 = defineEvent(
  'game.started',
  1,
  z.object({
    gameId: IdSchema,
    white: PlayerRefSchema,
    black: PlayerRefSchema,
    timeControl: TimeControlIdSchema,
    category: TimeCategorySchema,
    rated: z.boolean(),
    startedAt: z.iso.datetime(),
  }),
);

export const GameFinishedV1 = defineEvent(
  'game.finished',
  1,
  z.object({
    gameId: IdSchema,
    white: PlayerRefSchema,
    black: PlayerRefSchema,
    timeControl: TimeControlIdSchema,
    category: TimeCategorySchema,
    rated: z.boolean(),
    result: GameResultSchema,
    winner: ColorSchema.nullable(),
    reason: EndReasonSchema.exclude(['aborted']),
    pgn: z.string().min(1),
    plyCount: z.number().int().nonnegative(),
    startedAt: z.iso.datetime(),
    endedAt: z.iso.datetime(),
  }),
);

/** No move was made in time; never rated. */
export const GameAbortedV1 = defineEvent(
  'game.aborted',
  1,
  z.object({
    gameId: IdSchema,
    white: PlayerRefSchema,
    black: PlayerRefSchema,
    timeControl: TimeControlIdSchema,
    abortedAt: z.iso.datetime(),
  }),
);

export type GameStartedV1 = z.infer<typeof GameStartedV1>;
export type GameFinishedV1 = z.infer<typeof GameFinishedV1>;
export type GameAbortedV1 = z.infer<typeof GameAbortedV1>;
