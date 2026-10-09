'use client';

import { opposite, type Color } from '@chess3d/chess-core';
import { useMemo } from 'react';
import { materialBalance, piecesFromFen, type PieceType } from '@/lib/board';
import { COLOR_LABEL, REASON_LABEL, outcomeTitle } from '@/lib/labels';
import { useGame } from './game-context';

const GLYPH: Record<Exclude<PieceType, 'k'>, string> = { q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

export function PlayersPanel({ thinking }: { thinking: boolean }) {
  const mode = useGame((s) => s.mode);
  const orientation = useGame((s) => s.orientation);
  const fen = useGame((s) => s.fen);
  const turn = useGame((s) => s.turn);
  const outcome = useGame((s) => s.outcome);
  const isCheck = useGame((s) => s.isCheck);

  const material = useMemo(() => materialBalance(piecesFromFen(fen)), [fen]);
  const player = mode.kind === 'ai' ? mode.playerColor : null;

  const nameOf = (color: Color) => {
    if (mode.kind === 'local') return COLOR_LABEL[color];
    return color === mode.playerColor ? 'Bạn' : 'Stockfish';
  };
  const subtitleOf = (color: Color) => {
    if (mode.kind === 'local') return 'Hai người một máy';
    return color === mode.playerColor
      ? `Cầm quân ${COLOR_LABEL[color].toLowerCase()}`
      : `Máy · cấp ${mode.level}`;
  };

  const status = outcome
    ? {
        text: `${outcomeTitle(outcome, player)} · ${REASON_LABEL[outcome.reason]}`,
        tone: 'bg-amber-400/20 text-amber-200',
      }
    : isCheck
      ? { text: `Chiếu! Lượt ${COLOR_LABEL[turn]}`, tone: 'bg-rose-500/20 text-rose-200' }
      : { text: `Lượt ${COLOR_LABEL[turn]}`, tone: 'bg-white/10 text-white/80' };

  const row = (color: Color) => {
    const active = !outcome && turn === color;
    const isEngine = mode.kind === 'ai' && color !== mode.playerColor;
    return (
      <div className="flex items-center gap-3">
        <div
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-2xl shadow-inner transition ${
            color === 'white'
              ? 'bg-stone-100 text-stone-800'
              : 'bg-stone-900 text-stone-100 ring-1 ring-white/15'
          } ${active ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent' : ''}`}
        >
          {isEngine ? '♚' : '♔'}
          {active && (
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{nameOf(color)}</span>
            {isEngine && thinking && active && (
              <span className="flex gap-0.5" aria-label="Máy đang suy nghĩ">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="thinking-dot h-1.5 w-1.5 rounded-full bg-white/80"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            )}
          </div>
          <div className="flex h-5 items-center gap-1 text-xs text-white/60">
            {material.captured[color].length === 0 ? (
              <span>{subtitleOf(color)}</span>
            ) : (
              <>
                <span className="text-base leading-none tracking-tighter text-white/80">
                  {material.captured[color].map((p) => GLYPH[p]).join('')}
                </span>
                {material.advantage[color] > 0 && (
                  <span className="font-semibold text-emerald-300">
                    +{material.advantage[color]}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="glass p-4" aria-label="Người chơi">
      {row(opposite(orientation))}
      <p
        aria-live="polite"
        className={`my-3 rounded-2xl px-3 py-2 text-center text-sm font-medium transition-colors ${status.tone}`}
      >
        {status.text}
      </p>
      {row(orientation)}
    </section>
  );
}
