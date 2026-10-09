'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SceneBackdrop } from '@/components/scene/SceneBackdrop';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { AI_LEVELS, type AiLevel } from '@/lib/ai-levels';

const LEVELS: Record<AiLevel, { name: string; elo: string }> = {
  1: { name: 'Tập sự', elo: '~400' },
  2: { name: 'Người mới', elo: '~700' },
  3: { name: 'Nghiệp dư', elo: '~1000' },
  4: { name: 'Câu lạc bộ', elo: '~1300' },
  5: { name: 'Mạnh', elo: '~1600' },
  6: { name: 'Chuyên gia', elo: '~1900' },
  7: { name: 'Kiện tướng', elo: '~2200' },
  8: { name: 'Đại kiện tướng', elo: '2500+' },
};

type ColorChoice = 'white' | 'black' | 'random';

const COLOR_OPTIONS: { value: ColorChoice; label: string; glyph: string }[] = [
  { value: 'white', label: 'Trắng', glyph: '♔' },
  { value: 'random', label: 'Ngẫu nhiên', glyph: '🎲' },
  { value: 'black', label: 'Đen', glyph: '♚' },
];

export function AiSetup() {
  const router = useRouter();
  const [level, setLevel] = useState<AiLevel>(3);
  const [color, setColor] = useState<ColorChoice>('white');

  const start = () => {
    const playerColor = color === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : color;
    router.push(`/game/ai?level=${level}&color=${playerColor}`);
  };

  return (
    <main className="relative min-h-svh overflow-hidden">
      <SceneBackdrop />
      <div className="relative z-10 flex min-h-svh items-center px-4 py-10 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24 }}
          className="glass w-full max-w-md p-6 sm:p-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeftIcon width={16} height={16} /> Trang chủ
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">Chơi với máy</h1>
          <p className="mt-1 text-sm text-white/65">
            Chọn độ khó và màu quân, Stockfish sẽ chờ bạn ở bàn.
          </p>

          <section className="mt-7">
            <div className="flex items-baseline justify-between">
              <h2 className="label">Cấp độ</h2>
              <span className="text-sm">
                <span className="font-semibold">{LEVELS[level].name}</span>
                <span className="ml-2 text-white/55">ELO {LEVELS[level].elo}</span>
              </span>
            </div>
            <div className="mt-3 grid grid-cols-8 gap-1.5">
              {AI_LEVELS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={level === value}
                  aria-label={`Cấp ${value}: ${LEVELS[value].name}`}
                  onClick={() => setLevel(value)}
                  className={`relative flex h-12 items-end justify-center rounded-xl pb-1.5 text-sm font-bold transition duration-200 ${
                    level === value
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`absolute inset-x-2 bottom-7 rounded-full ${level === value ? 'bg-slate-950/40' : 'bg-white/30'}`}
                    style={{ height: 2 + value * 1.5 }}
                  />
                  {value}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-7">
            <h2 className="label">Bạn cầm quân</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={color === option.value}
                  onClick={() => setColor(option.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl py-3 text-sm font-medium transition duration-200 ${
                    color === option.value
                      ? 'bg-white text-slate-900 shadow-lg'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <span className="text-2xl leading-none">{option.glyph}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={start}
            className="btn-primary mt-8 w-full py-3.5 text-base"
          >
            Bắt đầu ván cờ
          </button>
        </motion.div>
      </div>
    </main>
  );
}
