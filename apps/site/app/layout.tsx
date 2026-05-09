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
    'On-chain identity, modular smart wallets, x402 settlement, capability discovery, escrowed marketplace, append-only reputation. One stack. EVM + Solana.',
  metadataBase: new URL('https://agentmesh-neon.vercel.app'),
  openGraph: {
    title: 'AgentMesh — agent economy protocol stack',
    description:
      'Six layers — identity, wallet, payment, discovery, marketplace, reputation — bundled into a composable on-chain stack. EVM + Solana.',
    type: 'website',
    siteName: 'AgentMesh',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentMesh',
    description: 'Six-layer protocol stack for the autonomous agent economy.',
  },
  keywords: [
    'agent economy',
    'agent protocol',
    'erc-4337',
    'erc-7579',
    'erc-8004',
    'x402',
    'autonomous agents',
    'agentmesh',
    'multi-chain',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
