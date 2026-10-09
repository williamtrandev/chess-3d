import Link from 'next/link';
import { SceneBackdrop } from '@/components/scene/SceneBackdrop';
import { SceneryPicker } from '@/components/scene/SceneryPicker';

const MODES = [
  {
    href: '/play/ai',
    icon: '🤖',
    title: 'Chơi với máy',
    text: 'Stockfish ngay trong trình duyệt, 8 cấp độ.',
  },
  {
    href: '/game/local',
    icon: '👥',
    title: 'Hai người một máy',
    text: 'Ngồi cạnh nhau, thay phiên đi quân.',
  },
  {
    href: '/avatar',
    icon: '🧑‍🎨',
    title: 'Nhân vật của bạn',
    text: 'Tạo người ngồi đánh cờ từ ảnh toàn thân.',
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-svh overflow-hidden">
      <SceneBackdrop />
      <div className="relative z-10 mx-auto flex min-h-svh max-w-7xl flex-col justify-between px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight drop-shadow">
            chess<span className="text-amber-300">3d</span>
          </span>
          <SceneryPicker />
        </header>

        <section className="max-w-2xl py-12">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide ring-1 ring-white/20 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            Cờ vua 3D · miễn phí · không cần cài đặt
          </p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[1.05] tracking-tight drop-shadow-lg sm:text-7xl">
            Một ván cờ giữa{' '}
            <span className="bg-gradient-to-r from-amber-200 to-emerald-200 bg-clip-text text-transparent">
              trời xanh
            </span>
            .
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/85 drop-shadow">
            Bày bàn cờ giữa đồng quê, bãi biển, núi tuyết hay vườn anh đào. Tự tạo nhân vật của bạn
            từ ảnh, ngồi vào bàn và đấu với Stockfish.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {MODES.map((mode) => (
              <Link
                key={mode.href}
                href={mode.href}
                className="glass group flex items-start gap-4 p-5 transition duration-300 hover:-translate-y-1 hover:bg-slate-950/70 hover:ring-amber-300/60"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-2xl transition group-hover:scale-110">
                  {mode.icon}
                </span>
                <span>
                  <span className="block font-semibold">{mode.title}</span>
                  <span className="mt-0.5 block text-sm text-white/70">{mode.text}</span>
                  <span className="mt-2 inline-block text-sm font-semibold text-amber-300 transition group-hover:translate-x-1">
                    Mở →
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="glass mt-3 flex items-center justify-between gap-4 p-4 opacity-80">
            <span className="flex items-center gap-3">
              <span className="text-2xl">🌐</span>
              <span>
                <span className="block font-semibold">Chơi online xếp hạng</span>
                <span className="block text-sm text-white/65">
                  Tìm trận theo ELO, bảng xếp hạng tuần.
                </span>
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs text-white/75">
              Sắp ra mắt
            </span>
          </div>
        </section>

        <footer className="text-xs text-white/60 drop-shadow">
          Stockfish 19 · Next.js · three.js
        </footer>
      </div>
    </main>
  );
}
