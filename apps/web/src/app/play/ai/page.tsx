import type { Metadata } from 'next';
import { AiSetup } from './AiSetup';

export const metadata: Metadata = { title: 'Chơi với máy' };

export default function PlayAiPage() {
  return <AiSetup />;
}
