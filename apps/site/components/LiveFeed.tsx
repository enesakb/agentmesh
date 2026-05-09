'use client';

/**
 * LiveFeed — vertical stream of agent activity events that feels live.
 *
 * In production this would subscribe to ServiceMarketplace events on a public
 * RPC (Polygon Amoy) via viem's watchContractEvent. Until the protocol is
 * deployed live, we emit believable events on a timer using realistic shapes
 * (addresses, costs, capability hashes, score deltas) drawn from the actual
 * demo run on local anvil. Tagged "DEMO STREAM" so it's never misleading.
 */
import { useEffect, useState } from 'react';
import { SectionHeading } from './Layers';

type Kind = 'register' | 'list' | 'order' | 'complete' | 'rep' | 'refund';

type Event = {
  id: number;
  kind: Kind;
  agent: string;
  counterparty?: string;
  price?: string;
  capability?: string;
  scoreDelta?: number;
  ts: number;
};

const ADDRS = [
  '0x74De72…f633',
  '0xba6e29…bc0A',
  '0x7c91A1…3a02',
  '0x9F09Ef…91e3',
  '0x4De724…E72f',
  '0x12fF8b…Aa44',
  '0x3CAaEf…D751',
  '0xab87cD…101a',
  '0x6F2E5b…C77e',
];

const CAPS = [
  'data.weather',
  'data.crypto-price',
  'compute.image',
  'data.news',
  'compute.text',
  'data.sports',
];
const PRICES = ['0.001', '0.0008', '0.002', '0.0015', '0.0005', '0.0025'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function makeEvent(seed: number): Event {
  // Weighted distribution: more orders/completions than registrations.
  const r = (seed * 7919) % 100;
  let kind: Kind;
  if (r < 4) kind = 'register';
  else if (r < 14) kind = 'list';
  else if (r < 50) kind = 'order';
  else if (r < 85) kind = 'complete';
  else if (r < 96) kind = 'rep';
  else kind = 'refund';

  return {
    id: seed,
    kind,
    agent: pick(ADDRS, seed),
    counterparty: pick(ADDRS, seed + 3),
    price: pick(PRICES, seed),
    capability: pick(CAPS, seed),
    scoreDelta: kind === 'rep' || kind === 'complete' ? 100 + (seed % 200) : undefined,
    ts: Date.now(),
  };
}

const LABEL: Record<Kind, { tag: string; color: string }> = {
  register: { tag: 'REGISTER', color: 'text-phosphor' },
  list: { tag: 'LISTING', color: 'text-phosphor' },
  order: { tag: 'ORDER', color: 'text-amber' },
  complete: { tag: 'COMPLETE', color: 'text-phosphor' },
  rep: { tag: 'REP·LOG', color: 'text-phosphor' },
  refund: { tag: 'REFUND', color: 'text-rust' },
};

const tickerColors: Record<Kind, string> = {
  register: 'border-l-phosphor/70',
  list: 'border-l-phosphor/70',
  order: 'border-l-amber/80',
  complete: 'border-l-phosphor/70',
  rep: 'border-l-phosphor/70',
  refund: 'border-l-rust/70',
};

export function LiveFeed() {
  const [events, setEvents] = useState<Event[]>(() =>
    Array.from({ length: 6 }, (_, i) => makeEvent(1000 + i)),
  );
  const [seed, setSeed] = useState(2000);

  useEffect(() => {
    const tick = () => {
      setEvents((prev) => [makeEvent(seed), ...prev].slice(0, 12));
      setSeed((s) => s + 1);
    };
    const id = setInterval(tick, 1100 + Math.random() * 900);
    return () => clearInterval(id);
  }, [seed]);

  const totals = {
    agents: 18,
    orders: 1247 + events.filter((e) => e.kind === 'order').length * 3,
    volume: '4.892',
    score: 2840,
  };

  return (
    <section id="feed" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="vii — pulse" title="live activity" subtitle="demo stream · 1 evt/sec" />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          {/* Aggregate totals — large numerals */}
          <div className="col-span-12 lg:col-span-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              <Big k="agents online" v={totals.agents.toString()} />
              <Big k="orders 24h" v={totals.orders.toLocaleString()} />
              <Big k="volume Ξ" v={totals.volume} />
              <Big k="avg score" v={totals.score.toString()} />
            </div>
            <p className="mt-10 max-w-[36ch] text-[12px] leading-[1.7] text-fg-muted border-l-2 border-line-bright pl-4">
              When the contracts are live on Polygon Amoy this feed will subscribe directly to{' '}
              <span className="text-fg">ServiceMarketplace</span> events via viem&apos;s{' '}
              <span className="text-fg">watchContractEvent</span>. For now: a believable simulation drawn from
              actual demo runs.
            </p>
          </div>

          {/* Live feed list */}
          <div className="col-span-12 lg:col-span-8 relative">
            <div className="absolute -top-3 left-6 px-2 bg-bg-elevated z-10 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
              <span className="text-phosphor blink">●</span> stream://agentmesh.events
            </div>
            <div className="border border-line bg-bg-card max-h-[520px] overflow-hidden relative">
              <div
                className="p-3 space-y-2"
                style={{ animation: 'feed-rise 280ms cubic-bezier(0.2, 0.7, 0.2, 1)' }}
                key={events[0]?.id}
              >
                {events.map((e, i) => (
                  <Row key={e.id} e={e} fade={i / events.length} />
                ))}
              </div>
              {/* fade-out at bottom */}
              <div className="pointer-events-none absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-bg-card to-transparent" />
            </div>
          </div>
        </div>
      </div>

      <style>
        {
          '@keyframes feed-rise { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }'
        }
      </style>
    </section>
  );
}

function Big({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted">
        <span className="text-phosphor">▮</span> {k}
      </div>
      <div
        className="font-display font-light text-[64px] lg:text-[88px] leading-[0.85] tracking-[-0.04em] text-fg mt-1 tabular-nums"
        style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1, "opsz" 144' }}
      >
        {v}
      </div>
    </div>
  );
}

function Row({ e, fade }: { e: Event; fade: number }) {
  const lbl = LABEL[e.kind];
  return (
    <div
      className={`px-4 py-2.5 border-l-2 ${tickerColors[e.kind]} bg-bg/40 grid grid-cols-12 gap-3 items-center text-[11px]`}
      style={{ opacity: 1 - fade * 0.6 }}
    >
      <span className={`col-span-2 uppercase tracking-[0.18em] ${lbl.color} font-bold`}>{lbl.tag}</span>
      <span className="col-span-3 text-fg-muted truncate">
        <span className="text-fg">{e.agent}</span>
      </span>
      <span className="col-span-1 text-fg-dim text-center">→</span>
      <span className="col-span-3 text-fg-muted truncate">
        <span className="text-fg">{e.counterparty}</span>
      </span>
      <span className="col-span-2 text-amber tabular-nums text-right">{e.price} Ξ</span>
      <span className="col-span-1 text-phosphor tabular-nums text-right">
        {e.scoreDelta ? `+${e.scoreDelta}` : ''}
      </span>
    </div>
  );
}
