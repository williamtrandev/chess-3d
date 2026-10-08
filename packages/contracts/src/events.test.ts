import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { GameFinishedV1, UnknownEventError, dlqTopic, parseEvent, TOPICS } from './index.js';

const GAME_ID = '01K6Z8V3Q9M2D7X4N5B6C7D8E9';
const WHITE = { id: '01K6Z8V3Q9M2D7X4N5B6C7D8EA', name: 'Alice', isGuest: false, rating: 1250 };
const BLACK = { id: '01K6Z8V3Q9M2D7X4N5B6C7D8EB', name: 'Guest-7F3A', isGuest: true };

const finished = {
  eventId: '01K6Z8V3Q9M2D7X4N5B6C7D8EC',
  type: 'game.finished',
  version: 1,
  occurredAt: '2026-10-08T10:00:00.000Z',
  key: GAME_ID,
  data: {
    gameId: GAME_ID,
    white: WHITE,
    black: BLACK,
    timeControl: '3+2',
    category: 'blitz',
    rated: false,
    result: '0-1',
    winner: 'black',
    reason: 'checkmate',
    pgn: '1. f3 e5 2. g4 Qh4# 0-1',
    plyCount: 4,
    startedAt: '2026-10-08T09:55:00.000Z',
    endedAt: '2026-10-08T10:00:00.000Z',
  },
};

describe('events', () => {
  it('parses a known event by type and version', () => {
    const event = parseEvent(finished);
    expect(event.type).toBe('game.finished');
    expect(GameFinishedV1.parse(finished).data.winner).toBe('black');
  });

  it('rejects an unknown type or version', () => {
    expect(() => parseEvent({ ...finished, type: 'game.exploded' })).toThrow(UnknownEventError);
    expect(() => parseEvent({ ...finished, version: 2 })).toThrow(/game.finished v2/);
  });

  it('rejects a payload that does not match its schema', () => {
    const bad = { ...finished, data: { ...finished.data, reason: 'aborted' } };
    expect(() => parseEvent(bad)).toThrow(ZodError);
    expect(() => parseEvent({ ...finished, eventId: 'not-a-ulid' })).toThrow(ZodError);
  });

  it('names dead-letter topics after their source topic', () => {
    expect(dlqTopic(TOPICS.game)).toBe('game.events.dlq');
  });
});
