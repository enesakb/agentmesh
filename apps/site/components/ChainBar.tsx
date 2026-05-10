// Live-on chain ribbon — communicates AgentMesh's multi-chain bet at a glance.
// "live" → green dot. "planned" → amber. "local" → muted. "code-ready" → cyan.
const CHAINS: {
  name: string;
  shortName: string;
  status: 'live' | 'planned' | 'local' | 'code-ready';
  explorer?: string;
}[] = [
  {
    name: 'Polygon',
    shortName: 'polygon',
    status: 'live',
    explorer: 'https://polygonscan.com/address/0xec1D1998955D83e62058d2C2650f6CC73637C63a',
  },
  {
    name: 'Anvil',
    shortName: 'anvil',
    status: 'local',
    explorer: 'https://github.com/enesakb/agentmesh#quick-start',
  },
  { name: 'Polygon Amoy', shortName: 'amoy', status: 'planned', explorer: 'https://amoy.polygonscan.com' },
  { name: 'Base Sepolia', shortName: 'base', status: 'planned', explorer: 'https://sepolia.basescan.org' },
  { name: 'Arbitrum Sepolia', shortName: 'arb', status: 'planned', explorer: 'https://sepolia.arbiscan.io' },
  {
    name: 'Optimism Sepolia',
    shortName: 'op',
    status: 'planned',
    explorer: 'https://sepolia-optimism.etherscan.io',
  },
  { name: 'Sonic Testnet', shortName: 'sonic', status: 'planned', explorer: 'https://testnet.sonicscan.org' },
  {
    name: 'Solana Devnet',
    shortName: 'solana',
    status: 'live',
    explorer: 'https://explorer.solana.com/address/ArEiEEh22N3sDqRAM57GN6MQXFYUJtAMiWM8ZW5xj2gg?cluster=devnet',
  },
];

const DOT: Record<'live' | 'planned' | 'local' | 'code-ready', string> = {
  live: 'text-phosphor',
  planned: 'text-amber',
  local: 'text-fg-muted',
  'code-ready': 'text-rust',
};

const STATUS_LABEL: Record<'live' | 'planned' | 'local' | 'code-ready', string> = {
  live: 'live',
  planned: 'soon',
  local: '',
  'code-ready': 'code',
};

export function ChainBar() {
  return (
    <section className="relative border-y border-line bg-bg-elevated/80 z-10">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-5 flex items-center gap-3 lg:gap-6 flex-wrap text-[10.5px] uppercase tracking-[0.22em]">
        <span className="text-fg-muted">live on</span>
        <span className="text-fg-dim">─</span>
        {CHAINS.map((c) => (
          <a
            key={c.shortName}
            href={c.explorer ?? '#'}
            target={c.explorer ? '_blank' : undefined}
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 hover:text-phosphor transition-colors ${
              c.status === 'local' ? 'text-fg-muted' : 'text-fg'
            }`}
          >
            <span className={DOT[c.status]}>●</span>
            <span>{c.shortName}</span>
            <span className="text-fg-dim ml-1">{STATUS_LABEL[c.status]}</span>
          </a>
        ))}
        <span className="ml-auto text-fg-dim hidden md:inline">one stack · n chains · evm + solana</span>
      </div>
    </section>
  );
}
