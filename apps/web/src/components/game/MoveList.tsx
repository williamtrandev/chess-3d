'use client';

import { useEffect, useRef } from 'react';
import { useGame } from './game-context';

export function MoveList() {
  const moves = useGame((s) => s.moves);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [moves.length]);

  const rows = Array.from({ length: Math.ceil(moves.length / 2) }, (_, i) => ({
    n: i + 1,
    white: moves[2 * i]?.san ?? '',
    black: moves[2 * i + 1]?.san,
  }));
  const last = moves.length - 1;

  return (
    <section className="glass flex min-h-0 flex-col p-4" aria-label="Nước đi">
      <h2 className="label mb-2">Nước đi</h2>
      {rows.length === 0 ? (
        <p className="py-2 text-sm text-white/50">Ván cờ chưa bắt đầu. Chúc may mắn!</p>
      ) : (
        <div className="scrollbar-none max-h-48 overflow-y-auto lg:max-h-56">
          <ol className="grid grid-cols-[2.25rem_1fr_1fr] gap-x-1 gap-y-0.5 font-mono text-sm">
            {rows.map((row) => (
              <li key={row.n} className="contents">
                <span className="py-1 text-white/40">{row.n}.</span>
                <span
                  className={`rounded-lg px-2 py-1 ${2 * row.n - 2 === last ? 'bg-white/20 font-semibold' : ''}`}
                >
                  {row.white}
                </span>
                <span
                  className={`rounded-lg px-2 py-1 ${2 * row.n - 1 === last ? 'bg-white/20 font-semibold' : ''}`}
                >
                  {row.black ?? ''}
                </span>
              </li>
            ))}
          </ol>
          <div ref={end} />
        </div>
      )}
    </section>
  );
}
