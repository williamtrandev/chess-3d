import { describe, expect, it } from 'vitest';
import { CLIENT_EVENTS, SERVER_EVENTS } from './index.js';

const gameId = '01K6Z8V3Q9M2D7X4N5B6C7D8E9';

describe('socket payloads', () => {
  it('accepts a valid move and rejects malformed squares', () => {
    const move = CLIENT_EVENTS['game:move'];
    expect(
      move.safeParse({ gameId, from: 'e7', to: 'e8', promotion: 'q', clientSeq: 3 }).success,
    ).toBe(true);
    expect(move.safeParse({ gameId, from: 'e9', to: 'e8', clientSeq: 3 }).success).toBe(false);
    expect(move.safeParse({ gameId, from: 'e7', to: 'e8', clientSeq: -1 }).success).toBe(false);
  });

  it('only accepts supported time controls', () => {
    expect(CLIENT_EVENTS['queue:join'].safeParse({ timeControl: '5+0' }).success).toBe(true);
    expect(CLIENT_EVENTS['queue:join'].safeParse({ timeControl: '4+0' }).success).toBe(false);
  });

  it('allows a null result only for aborted games in game:ended', () => {
    const ended = SERVER_EVENTS['game:ended'];
    expect(ended.safeParse({ gameId, result: null, winner: null, reason: 'aborted' }).success).toBe(
      true,
    );
    expect(
      ended.safeParse({
        gameId,
        result: '1-0',
        winner: 'white',
        reason: 'resignation',
        ratingChange: { before: 1200, after: 1220 },
      }).success,
    ).toBe(true);
  });

  it('validates game state snapshots', () => {
    const state = {
      gameId,
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      moves: ['e2e4'],
      clocks: { white: 180_000, black: 180_000 },
      turn: 'black',
      status: 'active',
      seq: 1,
    };
    expect(SERVER_EVENTS['game:state'].safeParse(state).success).toBe(true);
    expect(SERVER_EVENTS['game:state'].safeParse({ ...state, moves: ['e4'] }).success).toBe(false);
  });
});
