import type { z } from 'zod';
import { EnvelopeHeaderSchema } from './envelope.js';
import { GameAbortedV1, GameFinishedV1, GameStartedV1 } from './game.js';
import { PlayerRegisteredV1 } from './player.js';
import { RatingUpdatedV1 } from './rating.js';

/**
 * Every known event schema, by type then version. Adding an incompatible change means
 * adding a new version here and keeping the old one until all consumers have migrated.
 */
export const EVENT_SCHEMAS = {
  'game.started': { 1: GameStartedV1 },
  'game.finished': { 1: GameFinishedV1 },
  'game.aborted': { 1: GameAbortedV1 },
  'player.registered': { 1: PlayerRegisteredV1 },
  'rating.updated': { 1: RatingUpdatedV1 },
} as const;

type Registry = typeof EVENT_SCHEMAS;
export type EventType = keyof Registry;
export type AnyEvent = {
  [T in EventType]: {
    [V in keyof Registry[T]]: z.infer<Registry[T][V] & z.ZodType>;
  }[keyof Registry[T]];
}[EventType];

export class UnknownEventError extends Error {
  override readonly name = 'UnknownEventError';
}

/**
 * Validate a raw event from the bus. Throws `UnknownEventError` for a type/version this
 * build does not know, and `ZodError` when the payload does not match its schema.
 */
export const parseEvent = (raw: unknown): AnyEvent => {
  const header = EnvelopeHeaderSchema.parse(raw);
  const versions: Record<number, z.ZodType> | undefined = EVENT_SCHEMAS[header.type as EventType];
  const schema = versions?.[header.version];
  if (!schema) throw new UnknownEventError(`Unknown event ${header.type} v${header.version}`);
  return schema.parse(raw) as AnyEvent;
};
