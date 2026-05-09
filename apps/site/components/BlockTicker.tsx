'use client';

import { useEffect, useState } from 'react';

// Lightweight live block counter. Polls a public Polygon Amoy RPC every 8s.
// Falls back gracefully if the RPC is unreachable — never errors visibly.
export function BlockTicker() {
  const [block, setBlock] = useState<bigint | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch('https://rpc-amoy.polygon.technology', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        });
        const data = (await res.json()) as { result?: string };
        if (alive && data.result) setBlock(BigInt(data.result));
      } catch {
        // Silent — keeps the previous value or null
      }
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (block === null) {
    return (
      <span className="text-fg-dim">
        <span className="text-fg-dim">⟁</span> amoy <span className="text-fg-dim">··</span>
      </span>
    );
  }

  return (
    <span className="text-amber">
      <span>⟁</span> amoy <span className="text-fg-muted">·</span>{' '}
      <span className="text-fg tabular-nums">#{block.toString()}</span>
    </span>
  );
}
