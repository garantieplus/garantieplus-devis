import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mode démo — Garantie Plus Dev',
  robots: 'noindex, nofollow',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
