import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GameScreen } from '@/components/game/GameScreen';
import { isAiLevel } from '@/lib/ai-levels';
import type { GameMode } from '@/lib/game-store';

export const metadata: Metadata = { title: 'Ván cờ' };

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Local games: `/game/ai?level=1..8&color=white|black` and `/game/local`. Online games come later. */
export default async function GamePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;

  let mode: GameMode;
  if (id === 'local') {
    mode = { kind: 'local' };
  } else if (id === 'ai') {
    const level = Number(query.level ?? 3);
    const color = query.color === 'black' ? 'black' : 'white';
    mode = { kind: 'ai', level: isAiLevel(level) ? level : 3, playerColor: color };
  } else {
    notFound();
  }

  return <GameScreen key={JSON.stringify(mode)} mode={mode} />;
}
