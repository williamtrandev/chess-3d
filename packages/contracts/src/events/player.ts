import { z } from 'zod';
import { IdSchema } from '../primitives.js';
import { defineEvent } from './envelope.js';

export const PlayerRegisteredV1 = defineEvent(
  'player.registered',
  1,
  z.object({
    userId: IdSchema,
    username: z.string().min(3).max(32),
    registeredAt: z.iso.datetime(),
  }),
);

export type PlayerRegisteredV1 = z.infer<typeof PlayerRegisteredV1>;
