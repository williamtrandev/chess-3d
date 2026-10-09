'use client';

import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { Activity } from '@/components/characters/Character';
import { ArrowLeftIcon } from '@/components/ui/icons';
import { BUILDS, BUILD_LABEL, HAIR_STYLES, HAIR_STYLE_LABEL, type Avatar } from '@/lib/avatar';
import { useMyAvatar } from '@/lib/avatar-store';
import { analyzeBody, type Landmark } from '@/lib/photo-analysis';

const AvatarPreview = dynamic(() => import('@/components/characters/AvatarPreview'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-white/50">Đang dựng nhân vật…</div>
  ),
});

type Status =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | { kind: 'done'; warnings: string[] }
  | { kind: 'error'; message: string };

const COLOR_FIELDS = [
  { key: 'skin', label: 'Da' },
  { key: 'hair', label: 'Tóc' },
  { key: 'top', label: 'Áo' },
  { key: 'bottom', label: 'Quần' },
  { key: 'shoes', label: 'Giày' },
] as const;

// Skeleton drawn over the photo, as pairs of MediaPipe landmark indices.
const BONES: [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
  [0, 2],
  [0, 5],
];

const PREVIEW_POSES: { activity: Activity; label: string }[] = [
  { activity: 'idle', label: 'Ngồi' },
  { activity: 'thinking', label: 'Suy nghĩ' },
  { activity: 'won', label: 'Ăn mừng' },
  { activity: 'lost', label: 'Buồn' },
];

export function AvatarEditor() {
  const saved = useMyAvatar((s) => s.avatar);
  const setAvatar = useMyAvatar((s) => s.setAvatar);
  const [draft, setDraft] = useState<Avatar>(saved);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [activity, setActivity] = useState<Activity>('idle');
  const [savedAt, setSavedAt] = useState(0);
  const [dragging, setDragging] = useState(false);
  const overlay = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // The saved avatar loads from storage after mount; start editing from it once it arrives.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    return useMyAvatar.persist.onFinishHydration((state) => {
      loaded.current = true;
      setDraft(state.avatar);
    });
  }, []);

  const update = (patch: Partial<Avatar>) => setDraft((d) => ({ ...d, ...patch }));

  const drawOverlay = (canvas: HTMLCanvasElement, landmarks: Landmark[]) => {
    const target = overlay.current;
    const context = target?.getContext('2d');
    if (!target || !context) return;
    target.width = canvas.width;
    target.height = canvas.height;
    context.drawImage(canvas, 0, 0);
    const point = (i: number) => ({
      x: (landmarks[i]?.x ?? 0) * canvas.width,
      y: (landmarks[i]?.y ?? 0) * canvas.height,
    });
    context.lineWidth = Math.max(2, canvas.width / 220);
    context.strokeStyle = 'rgba(52, 211, 153, 0.9)';
    for (const [a, b] of BONES) {
      context.beginPath();
      context.moveTo(point(a).x, point(a).y);
      context.lineTo(point(b).x, point(b).y);
      context.stroke();
    }
    context.fillStyle = '#fbbf24';
    for (let i = 0; i < landmarks.length; i++) {
      context.beginPath();
      context.arc(point(i).x, point(i).y, context.lineWidth * 1.6, 0, Math.PI * 2);
      context.fill();
    }
  };

  const analyze = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus({ kind: 'error', message: 'Hãy chọn một file ảnh (JPG, PNG, HEIC đã chuyển…).' });
      return;
    }
    try {
      setStatus({ kind: 'working', step: 'Đang đọc ảnh…' });
      const { cropFace, detectPose, loadImage } = await import('@/lib/pose-detector');
      const photo = await loadImage(file);
      setStatus({
        kind: 'working',
        step: 'AI đang nhận dạng dáng người (lần đầu tải mô hình ~9 MB)…',
      });
      const pose = await detectPose(photo);
      setStatus({ kind: 'working', step: 'Đang lấy màu da, tóc, quần áo…' });
      const result = analyzeBody(pose.image, pose.landmarks, pose.mask);
      drawOverlay(pose.canvas, pose.landmarks);
      const face = result.face ? cropFace(pose.canvas, result.face) : '';
      setDraft((d) => ({
        ...d,
        skin: result.skin ?? d.skin,
        hair: result.hair ?? d.hair,
        top: result.top ?? d.top,
        bottom: result.bottom ?? d.bottom,
        shoes: result.shoes ?? d.shoes,
        hairStyle: result.hairStyle,
        build: result.build,
        face: face || d.face,
        useFace: Boolean(face) || d.useFace,
      }));
      setStatus({ kind: 'done', warnings: result.warnings });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Không phân tích được ảnh.',
      });
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void analyze(file);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void analyze(file);
  };

  const save = () => {
    setAvatar(draft);
    setSavedAt(Date.now());
  };

  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(0), 2500);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const busy = status.kind === 'working';

  return (
    <main className="min-h-svh bg-[radial-gradient(ellipse_at_top,#1e3a5f_0%,#0b1220_60%)] px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
          >
            <ArrowLeftIcon width={16} height={16} /> Trang chủ
          </Link>
          <Link href="/play/ai" className="btn">
            Vào chơi
          </Link>
        </header>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Nhân vật của bạn
        </h1>
        <p className="mt-1 max-w-2xl text-white/65">
          Tải lên một ảnh toàn thân: AI nhận dạng dáng người ngay trong trình duyệt rồi lấy màu da,
          tóc, áo, quần, giày và khuôn mặt cho nhân vật ngồi đánh cờ. Bạn chỉnh lại tùy ý trước khi
          lưu.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="glass space-y-5 p-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition ${
                dragging ? 'border-amber-300 bg-amber-300/10' : 'border-white/20 bg-white/5'
              }`}
            >
              <canvas
                ref={overlay}
                className={`mx-auto max-h-72 max-w-full rounded-xl ${status.kind === 'done' ? 'block' : 'hidden'}`}
                aria-label="Ảnh của bạn và khung xương AI nhận dạng"
              />
              {status.kind !== 'done' && (
                <div className="py-6">
                  <p className="text-4xl">📸</p>
                  <p className="mt-2 font-semibold">Kéo thả ảnh toàn thân vào đây</p>
                  <p className="text-sm text-white/55">
                    Đứng thẳng, thấy rõ từ đầu tới chân, nền gọn càng tốt.
                  </p>
                </div>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy}
                  onClick={() => fileInput.current?.click()}
                >
                  {status.kind === 'done' ? 'Chọn ảnh khác' : 'Chọn ảnh'}
                </button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFile}
              />
            </div>

            <AnimatePresence mode="wait">
              {status.kind === 'working' && (
                <motion.p
                  key="working"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-amber-200"
                >
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-amber-200 border-t-transparent" />
                  {status.step}
                </motion.p>
              )}
              {status.kind === 'error' && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl bg-rose-500/15 px-3 py-2 text-sm text-rose-200"
                >
                  {status.message}
                </motion.p>
              )}
              {status.kind === 'done' && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-1 text-sm"
                >
                  <p className="text-emerald-300">
                    ✓ Đã lấy màu và khuôn mặt từ ảnh. Xem trước bên cạnh.
                  </p>
                  {status.warnings.map((w) => (
                    <p key={w} className="text-amber-200">
                      • {w}
                    </p>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <label className="block">
              <span className="label">Tên hiển thị</span>
              <input
                value={draft.name}
                maxLength={24}
                onChange={(e) => update({ name: e.target.value })}
                className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10 outline-none focus:ring-amber-300"
              />
            </label>

            <div>
              <p className="label mb-2">Màu sắc</p>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer flex-col items-center gap-1 text-xs text-white/70"
                  >
                    <span
                      className="relative h-11 w-11 overflow-hidden rounded-2xl ring-2 ring-white/20"
                      style={{ background: draft[key] }}
                    >
                      <input
                        type="color"
                        value={draft[key]}
                        onChange={(e) => update({ [key]: e.target.value })}
                        className="absolute inset-0 cursor-pointer opacity-0"
                        aria-label={`Màu ${label.toLowerCase()}`}
                      />
                    </span>
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-2">Kiểu tóc</p>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_STYLES.map((style) => (
                  <button
                    key={style}
                    type="button"
                    aria-pressed={draft.hairStyle === style}
                    onClick={() => update({ hairStyle: style })}
                    className={`rounded-xl px-3 py-1.5 text-sm transition ${draft.hairStyle === style ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {HAIR_STYLE_LABEL[style]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label mb-2">Dáng người</p>
                <div className="segmented w-56">
                  {BUILDS.map((build) => (
                    <button
                      key={build}
                      type="button"
                      aria-pressed={draft.build === build}
                      onClick={() => update({ build })}
                    >
                      {BUILD_LABEL[build]}
                    </button>
                  ))}
                </div>
              </div>
              <label
                className={`flex items-center gap-2 text-sm ${draft.face ? '' : 'opacity-40'}`}
              >
                <input
                  type="checkbox"
                  checked={draft.useFace}
                  disabled={!draft.face}
                  onChange={(e) => update({ useFace: e.target.checked })}
                  className="h-4 w-4 accent-amber-400"
                />
                Dùng khuôn mặt từ ảnh
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="btn-primary" onClick={save}>
                Lưu nhân vật
              </button>
              <button type="button" className="btn" onClick={() => setDraft(saved)}>
                Hoàn tác
              </button>
              <AnimatePresence>
                {savedAt > 0 && (
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="self-center text-sm text-emerald-300"
                  >
                    ✓ Đã lưu. Nhân vật sẽ ngồi vào bàn ở ván tiếp theo.
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <p className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/55">
              🔒 Ảnh chỉ được xử lý trên máy bạn và không được tải lên đâu cả. Chỉ màu sắc và một
              ảnh nhỏ khuôn mặt được lưu trong trình duyệt này.
            </p>
          </section>

          <section className="glass flex min-h-[460px] flex-col overflow-hidden p-0">
            <div className="min-h-0 flex-1">
              <AvatarPreview avatar={draft} activity={activity} />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-white/10 p-3">
              <span className="truncate font-semibold">{draft.name || 'Bạn'}</span>
              <div className="segmented">
                {PREVIEW_POSES.map((pose) => (
                  <button
                    key={pose.activity}
                    type="button"
                    aria-pressed={activity === pose.activity}
                    onClick={() => setActivity(pose.activity)}
                  >
                    {pose.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
