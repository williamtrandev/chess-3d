import { z } from 'zod';
import {
  ClocksSchema,
  ColorSchema,
  EndReasonSchema,
  GameResultSchema,
  IdSchema,
  PlayerRefSchema,
  PromotionSchema,
  SquareSchema,
  TimeControlIdSchema,
  UciMoveSchema,
} from './primitives.js';

const GameRef = z.object({ gameId: IdSchema });

/** Messages the client sends to `game-server`. */
export const CLIENT_EVENTS = {
  'queue:join': z.object({ timeControl: TimeControlIdSchema }),
  'queue:leave': z.object({ timeControl: TimeControlIdSchema }),
  'game:move': GameRef.extend({
    from: SquareSchema,
    to: SquareSchema,
    promotion: PromotionSchema.optional(),
    clientSeq: z.number().int().nonnegative(),
  }),
  'game:resign': GameRef,
  'game:offerDraw': GameRef,
  'game:respondDraw': GameRef.extend({ accept: z.boolean() }),
} as const;

export const MOVE_REJECTIONS = [
  'game_over',
  'not_your_turn',
  'illegal_move',
  'stale_seq',
  'not_in_game',
  'rate_limited',
] as const;

export const GameStatusSchema = z.enum(['waiting', 'active', 'ended']);

/** Messages `game-server` sends to the client. */
export const SERVER_EVENTS = {
  'match:found': GameRef.extend({
    color: ColorSchema,
    opponent: PlayerRefSchema,
    timeControl: TimeControlIdSchema,
  }),
  'game:state': GameRef.extend({
    fen: z.string().min(1),
    moves: z.array(UciMoveSchema),
    clocks: ClocksSchema,
    turn: ColorSchema,
    status: GameStatusSchema,
    seq: z.number().int().nonnegative(),
  }),
  'game:moved': GameRef.extend({
    uci: UciMoveSchema,
    san: z.string().min(2),
    fen: z.string().min(1),
    clocks: ClocksSchema,
    seq: z.number().int().positive(),
  }),
  'game:rejected': GameRef.extend({
    clientSeq: z.number().int().nonnegative(),
    reason: z.enum(MOVE_REJECTIONS),
  }),
  'game:drawOffered': GameRef.extend({ by: ColorSchema }),
  'game:ended': GameRef.extend({
    result: GameResultSchema.nullable(),
    winner: ColorSchema.nullable(),
    reason: EndReasonSchema,
    ratingChange: z
      .object({ before: z.number().int().positive(), after: z.number().int().positive() })
      .optional(),
  }),
} as const;

type Payloads<T extends Record<string, z.ZodType>> = { [K in keyof T]: z.infer<T[K]> };
export type ClientPayloads = Payloads<typeof CLIENT_EVENTS>;
export type ServerPayloads = Payloads<typeof SERVER_EVENTS>;

/** Typed event maps for Socket.IO (`Server<ClientToServerEvents, ServerToClientEvents>`). */
export type ClientToServerEvents = {
  [K in keyof ClientPayloads]: (payload: ClientPayloads[K]) => void;
};
export type ServerToClientEvents = {
  [K in keyof ServerPayloads]: (payload: ServerPayloads[K]) => void;
};
