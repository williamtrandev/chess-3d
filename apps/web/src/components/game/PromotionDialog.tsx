'use client';

import { motion } from 'motion/react';
import type { Color, PromotionPiece } from '@chess3d/chess-core';

const OPTIONS: { piece: PromotionPiece; label: string; glyph: string }[] = [
  { piece: 'q', label: 'Hậu', glyph: '♛' },
  { piece: 'r', label: 'Xe', glyph: '♜' },
  { piece: 'b', label: 'Tượng', glyph: '♝' },
  { piece: 'n', label: 'Mã', glyph: '♞' },
];

export function PromotionDialog({
  color,
  onChoose,
}: {
  color: Color;
  onChoose: (piece: PromotionPiece | null) => void;
}) {
  return (
    <motion.div
      role="dialog"
      aria-label="Chọn quân phong cấp"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="glass-strong pointer-events-auto z-30 p-4"
    >
      <p className="label mb-3 text-center">Phong cấp thành</p>
      <div className="flex gap-2">
        {OPTIONS.map(({ piece, label, glyph }) => (
          <button
            key={piece}
            type="button"
            aria-label={label}
            onClick={() => onChoose(piece)}
            className="group flex h-20 w-[4.5rem] flex-col items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10 transition duration-200 hover:-translate-y-1 hover:bg-white/20"
          >
            <span
              className="text-5xl leading-none transition group-hover:scale-110"
              style={{
                color: color === 'white' ? '#fafaf9' : '#1c1917',
                textShadow: color === 'white' ? '0 1px 2px #0008' : '0 0 2px #fff, 0 0 6px #fff8',
              }}
            >
              {glyph}
            </span>
            <span className="mt-1 text-[11px] text-white/70">{label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChoose(null)}
        className="mt-3 w-full text-xs text-white/60 hover:text-white"
      >
        Hủy
      </button>
    </motion.div>
  );
}
