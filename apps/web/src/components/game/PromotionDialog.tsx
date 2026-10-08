'use client';

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
    <div
      role="dialog"
      aria-label="Chọn quân phong cấp"
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => onChoose(null)}
    >
      <div
        className="flex gap-3 rounded-2xl bg-zinc-900/95 p-4 shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {OPTIONS.map(({ piece, label, glyph }) => (
          <button
            key={piece}
            type="button"
            aria-label={label}
            onClick={() => onChoose(piece)}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-xl bg-zinc-800 text-5xl transition hover:-translate-y-0.5 hover:bg-zinc-700"
            style={{
              color: color === 'white' ? '#f5f5f4' : '#18181b',
              textShadow: color === 'white' ? '0 0 2px #000' : '0 0 2px #fff',
            }}
          >
            {glyph}
            <span className="mt-1 text-xs text-zinc-300" style={{ textShadow: 'none' }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
