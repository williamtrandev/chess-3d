import type { SceneryId } from '@/lib/scenery';

const GRADIENTS: Record<SceneryId, string> = {
  field: 'bg-[linear-gradient(180deg,#8ec5f0_0%,#cfe7f5_45%,#9cc96b_46%,#4f8a34_100%)]',
  beach:
    'bg-[linear-gradient(180deg,#7cc4f2_0%,#cdeefa_42%,#2fb5c4_43%,#0b6f9a_70%,#f1dcaa_71%,#e2c58b_100%)]',
  studio: 'bg-[radial-gradient(ellipse_at_top,#2a2f3a_0%,#0b0e14_70%)]',
};

/** Painted stand-in for the 3D scenery while it loads, or when WebGL is unavailable. */
export function StaticBackdrop({ scenery }: { scenery: SceneryId }) {
  return <div aria-hidden className={`absolute inset-0 ${GRADIENTS[scenery]}`} />;
}
