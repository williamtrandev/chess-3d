'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { GameOutcome } from '@chess3d/chess-core';
import { REASON_LABEL, outcomeTitle } from '@/lib/labels';
import { seededRandom } from '@/lib/scenery';
import { useGame } from './game-context';

const CONFETTI_COLORS = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#ffffff'];

function Confetti({ seed }: { seed: number }) {
  const pieces = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: 60 }, () => ({
      x: (random() - 0.5) * 520,
      y: 260 + random() * 200,
      rotate: random() * 720 - 360,
      delay: random() * 0.25,
      duration: 1.6 + random() * 1.2,
      color: CONFETTI_COLORS[Math.floor(random() * CONFETTI_COLORS.length)],
      w: 6 + random() * 6,
    }));
  }, [seed]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/3 rounded-sm"
          style={{ width: p.w, height: p.w * 0.45, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, -140 - p.y * 0.3, p.y], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

export function ResultDialog() {
  const outcome = useGame((s) => s.outcome);
  const mode = useGame((s) => s.mode);
  const newGame = useGame((s) => s.newGame);
  const plies = useGame((s) => s.moves.length);
  // Remember which outcome was dismissed, so a new game's result shows again.
  const [dismissed, setDismissed] = useState<GameOutcome | null>(null);

  const player = mode.kind === 'ai' ? mode.playerColor : null;
  const celebrate = outcome?.winner != null && (player === null || outcome.winner === player);

  return (
    <AnimatePresence>
      {outcome && outcome !== dismissed && (
        <motion.div
          key="result"
          role="dialog"
          aria-label="Kết quả ván"
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.35 }}
          className="glass-strong pointer-events-auto relative z-30 w-full max-w-sm p-7 text-center"
        >
          {celebrate && <Confetti seed={plies} />}
          <p className="text-4xl">{outcome.winner === null ? '🤝' : celebrate ? '🏆' : '♟️'}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">
            {outcomeTitle(outcome, player)}
          </p>
          <p className="mt-1 text-white/70">{REASON_LABEL[outcome.reason]}</p>
          {outcome.result && (
            <p className="mt-3 font-mono text-xl text-amber-300">{outcome.result}</p>
          )}
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" className="btn-primary" onClick={() => newGame(mode)}>
              Chơi lại
            </button>
            <button type="button" className="btn" onClick={() => setDismissed(outcome)}>
              Xem bàn cờ
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
