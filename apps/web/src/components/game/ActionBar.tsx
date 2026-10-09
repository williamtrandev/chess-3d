'use client';

import { useEffect, useState } from 'react';
import { EyeIcon, FlagIcon, FlipIcon, RefreshIcon } from '../ui/icons';
import { useGame } from './game-context';

export function ActionBar({
  topDown,
  onToggleTopDown,
  can3D,
}: {
  topDown: boolean;
  onToggleTopDown: () => void;
  can3D: boolean;
}) {
  const mode = useGame((s) => s.mode);
  const outcome = useGame((s) => s.outcome);
  const newGame = useGame((s) => s.newGame);
  const resign = useGame((s) => s.resign);
  const flip = useGame((s) => s.flip);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const actions = [
    {
      label: confirming ? 'Chắc chưa?' : 'Đầu hàng',
      icon: <FlagIcon />,
      onClick: () => {
        if (confirming) {
          resign();
          setConfirming(false);
        } else setConfirming(true);
      },
      disabled: Boolean(outcome),
      danger: confirming,
    },
    { label: 'Ván mới', icon: <RefreshIcon />, onClick: () => newGame(mode) },
    { label: 'Lật bàn', icon: <FlipIcon />, onClick: () => flip() },
    {
      label: topDown ? 'Góc nghiêng' : 'Nhìn từ trên',
      icon: <EyeIcon />,
      onClick: onToggleTopDown,
      disabled: !can3D,
    },
  ];

  return (
    <section className="glass grid grid-cols-4 gap-1.5 p-2" aria-label="Thao tác">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] font-medium transition duration-200 hover:bg-white/15 active:scale-95 disabled:pointer-events-none disabled:opacity-35 ${
            action.danger ? 'bg-rose-500/80 text-white hover:bg-rose-500' : 'text-white/85'
          }`}
        >
          {action.icon}
          {action.label}
        </button>
      ))}
    </section>
  );
}
