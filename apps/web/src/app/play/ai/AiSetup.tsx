'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AI_LEVELS, type AiLevel } from '@/lib/ai-levels';

const LEVEL_NAMES: Record<AiLevel, string> = {
  1: 'Tập sự',
  2: 'Người mới',
  3: 'Nghiệp dư',
  4: 'Câu lạc bộ',
  5: 'Mạnh',
  6: 'Chuyên gia',
  7: 'Kiện tướng',
  8: 'Đại kiện tướng',
};

type ColorChoice = 'white' | 'black' | 'random';

const COLOR_OPTIONS: { value: ColorChoice; label: string }[] = [
  { value: 'white', label: 'Trắng' },
  { value: 'random', label: 'Ngẫu nhiên' },
  { value: 'black', label: 'Đen' },
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
    <main className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-xl px-6 py-12">
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Trang chủ
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Chơi với máy</h1>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-400">Cấp độ</h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {AI_LEVELS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={level === value}
                onClick={() => setLevel(value)}
                className={`rounded-xl py-3 text-lg font-semibold transition ${
                  level === value ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-400">{LEVEL_NAMES[level]}</p>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-400">Bạn cầm quân</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={color === option.value}
                onClick={() => setColor(option.value)}
                className={`rounded-xl py-3 font-medium transition ${
                  color === option.value
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <button type="button" onClick={start} className="btn-primary mt-10 w-full py-3 text-base">
          Bắt đầu
        </button>
      </div>
    </main>
  );
}
