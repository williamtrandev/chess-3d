import type { SceneryId } from '@/lib/scenery';

const GRADIENTS: Record<SceneryId, string> = {
  field: 'bg-[linear-gradient(180deg,#8ec5f0_0%,#cfe7f5_45%,#9cc96b_46%,#4f8a34_100%)]',
  sunset:
    'bg-[linear-gradient(180deg,#6b4c7a_0%,#f08a5d_35%,#f6c27a_46%,#8a7a32_47%,#3f4a1c_100%)]',
  snow: 'bg-[linear-gradient(180deg,#b9cfe6_0%,#e6eef6_45%,#f4f8fc_46%,#dfe8f1_100%)]',
  night: 'bg-[linear-gradient(180deg,#050816_0%,#0f1d44_45%,#13301f_46%,#08150e_100%)]',
  sakura: 'bg-[linear-gradient(180deg,#f8d7e3_0%,#fbeef3_45%,#8fb06a_46%,#55743a_100%)]',
  beach:
    'bg-[linear-gradient(180deg,#7cc4f2_0%,#cdeefa_42%,#2fb5c4_43%,#0b6f9a_70%,#f1dcaa_71%,#e2c58b_100%)]',
  studio: 'bg-[radial-gradient(ellipse_at_top,#2a2f3a_0%,#0b0e14_70%)]',
};

/** Painted stand-in for the 3D scenery while it loads, or when WebGL is unavailable. */
export function StaticBackdrop({ scenery }: { scenery: SceneryId }) {
  return <div aria-hidden className={`absolute inset-0 ${GRADIENTS[scenery]}`} />;
}
