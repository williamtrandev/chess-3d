import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import type { ReactNode } from 'react';
import { SettingsHydrator } from '@/components/SettingsHydrator';
import './globals.css';

const font = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-be-vietnam',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'chess3d', template: '%s · chess3d' },
  description: 'Cờ vua 3D giữa đồng quê hay bãi biển: chơi với máy hoặc online, xếp hạng ELO.',
};

export const viewport: Viewport = { themeColor: '#0b1220' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Browser extensions often add classes to <html> before React loads (e.g. "mdl-js");
    // ignore those attribute differences instead of reporting a hydration error.
    <html lang="vi" className={font.variable} suppressHydrationWarning>
      <body className="font-sans text-white antialiased">
        <SettingsHydrator />
        {children}
      </body>
    </html>
  );
}
