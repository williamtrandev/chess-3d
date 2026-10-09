import type { Metadata } from 'next';
import { AvatarEditor } from './AvatarEditor';

export const metadata: Metadata = { title: 'Nhân vật của bạn' };

export default function AvatarPage() {
  return <AvatarEditor />;
}
