/** Kafka topics. Game events are keyed by `gameId`, player and rating events by `userId`. */
export const TOPICS = {
  game: 'game.events',
  player: 'player.events',
  rating: 'rating.events',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

/** Dead-letter topic for events that failed after all retries. */
export const dlqTopic = (topic: Topic): `${Topic}.dlq` => `${topic}.dlq`;
