import { z } from 'zod';

/** Fields shared by every event, regardless of type. */
export const EnvelopeHeaderSchema = z.object({
  eventId: z.ulid(),
  type: z.string().min(1),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  key: z.string().min(1),
  traceparent: z.string().optional(),
});

/** Build the schema of one event type at one version. */
export const defineEvent = <
  const Type extends string,
  const Version extends number,
  Data extends z.ZodType,
>(
  type: Type,
  version: Version,
  data: Data,
) =>
  EnvelopeHeaderSchema.extend({
    type: z.literal(type),
    version: z.literal(version),
    data,
  });
