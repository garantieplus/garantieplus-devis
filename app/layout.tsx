import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Devis Garantie Panne Mecanique — Garantie Plus',
  description:
    'Obtenez instantanement votre devis de Garantie Panne Mecanique automobile. Garantie Plus, courtier en garanties panne mecanique — ORIAS n°25004236.',
  robots: 'noindex',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.className} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
