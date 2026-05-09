import type { Metadata } from 'next';
import { Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AgentMesh — six-layer protocol stack for the agent economy',
  description:
    'On-chain identity, modular smart wallets, x402 settlement, capability discovery, escrowed marketplace, append-only reputation. One stack.',
  metadataBase: new URL('https://agentmesh.xyz'),
  openGraph: {
    title: 'AgentMesh',
    description: 'Six-layer protocol stack for the autonomous agent economy.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
