import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'chess3d', template: '%s · chess3d' },
  description: 'Cờ vua 3D: chơi với máy hoặc online, xếp hạng ELO.',
};

export const viewport: Viewport = { themeColor: '#09090b' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
