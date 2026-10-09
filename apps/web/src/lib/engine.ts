import type { EngineSettings } from './ai-levels';
import { parseBestMove, searchCommands } from './uci';

/**
 * Stockfish running in a Web Worker, spoken to over UCI. Searches are serialized:
 * a new request waits for the previous one to finish.
 */
export class StockfishEngine {
  readonly #worker: Worker;
  readonly #listeners = new Set<(line: string) => void>();
  readonly #ready: Promise<void>;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(url = '/engine/stockfish.js') {
    this.#worker = new Worker(url);
    this.#worker.onmessage = (event: MessageEvent<unknown>) => {
      const line = String(event.data);
      for (const listener of this.#listeners) listener(line);
    };
    this.#ready = this.#send('uci', (l) => l === 'uciok').then(() =>
      this.#send('isready', (l) => l === 'readyok'),
    ) as Promise<void>;
  }

  /** Best move in UCI notation for the position reached from `startFen` by `moves`. */
  bestMove(
    startFen: string,
    moves: readonly string[],
    settings: EngineSettings,
  ): Promise<string | null> {
    const run = async () => {
      await this.#ready;
      const [skill, position, go] = searchCommands(startFen, moves, settings) as [
        string,
        string,
        string,
      ];
      this.#worker.postMessage(skill);
      this.#worker.postMessage(position);
      const line = await this.#send(go, (l) => l.startsWith('bestmove'));
      return parseBestMove(line);
    };
    const result = this.#queue.then(run, run);
    this.#queue = result.catch(() => undefined);
    return result;
  }

  /** Ask the engine to stop the current search early (it still replies with a bestmove). */
  stop(): void {
    this.#worker.postMessage('stop');
  }

  dispose(): void {
    this.#listeners.clear();
    this.#worker.terminate();
  }

  #send(command: string, until: (line: string) => boolean): Promise<string> {
    return new Promise((resolve) => {
      const listener = (line: string) => {
        if (!until(line)) return;
        this.#listeners.delete(listener);
        resolve(line);
      };
      this.#listeners.add(listener);
      this.#worker.postMessage(command);
    });
  }
}
