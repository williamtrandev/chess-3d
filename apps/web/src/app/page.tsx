import Link from 'next/link';

const MODES = [
  {
    href: '/play/ai',
    title: 'Chơi với máy',
    text: 'Stockfish chạy ngay trong trình duyệt, 8 cấp độ từ tập sự tới đại kiện tướng.',
    cta: 'Chọn cấp độ',
  },
  {
    href: '/game/local',
    title: 'Hai người một máy',
    text: 'Ngồi cạnh nhau và thay phiên đi quân trên cùng một bàn cờ.',
    cta: 'Bắt đầu',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#3f2a14_0%,#09090b_60%)] text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col px-6 py-16 sm:py-24">
        <p className="text-sm font-semibold tracking-[0.3em] text-amber-400 uppercase">chess3d</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
          Cờ vua trên bàn cờ 3D, ngay trong trình duyệt.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-zinc-400">
          Xoay bàn, kéo thả quân, nghe tiếng quân chạm bàn. Chơi với máy ngay bây giờ; chơi online
          xếp hạng ELO sắp ra mắt.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {MODES.map((mode) => (
            <Link
              key={mode.href}
              href={mode.href}
              className="group rounded-2xl bg-zinc-900/80 p-6 ring-1 ring-white/10 transition hover:-translate-y-1 hover:ring-amber-400/60"
            >
              <h2 className="text-xl font-semibold">{mode.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{mode.text}</p>
              <span className="mt-6 inline-block text-sm font-semibold text-amber-400 group-hover:underline">
                {mode.cta} →
              </span>
            </Link>
          ))}
          <div className="rounded-2xl bg-zinc-900/40 p-6 ring-1 ring-white/5">
            <h2 className="text-xl font-semibold text-zinc-400">Chơi online</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Tìm trận theo ELO, đồng hồ do server tính, bảng xếp hạng theo tuần.
            </p>
            <span className="mt-6 inline-block rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
              Sắp ra mắt
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
