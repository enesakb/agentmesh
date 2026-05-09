'use client';

/**
 * TryLive — real interactive widget that exercises the hosted /api/weather
 * endpoint exactly like a beta agent would.
 *
 * Step 0: idle. User clicks "fetch /weather/Berlin"
 * Step 1: GET → server returns 402 with x402 accept body. Show it.
 * Step 2: User clicks "place order". Client POSTs /api/orders → orderId.
 * Step 3: User clicks "retry with payment". Client repeats GET with
 *         `X-PAYMENT: agentmesh-marketplace;orderId=<n>` → 200 + weather.
 *
 * Every fetch is a real HTTP round-trip to a Vercel Edge Function. No
 * simulation. The orderId rejects replay (single-use).
 */
import { useEffect, useRef, useState } from 'react';
import { SectionHeading } from './Layers';

type Phase = 0 | 1 | 2 | 3 | 4;

type LogEntry = {
  kind: 'req' | 'res' | 'note' | 'err';
  text: string;
  ts: number;
};

export function TryLive() {
  const [phase, setPhase] = useState<Phase>(0);
  const [city, setCity] = useState('Berlin');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function append(e: LogEntry) {
    setLog((l) => [...l, e]);
  }

  async function step1() {
    setBusy(true);
    setData(null);
    try {
      append({ kind: 'req', ts: Date.now(), text: `GET /api/weather/${city}` });
      const r = await fetch(`/api/weather/${encodeURIComponent(city)}`);
      const body = await r.json();
      append({
        kind: 'res',
        ts: Date.now(),
        text: `${r.status} ${r.statusText} · ${JSON.stringify(body).slice(0, 110)}`,
      });
      if (r.status !== 402) {
        append({ kind: 'err', ts: Date.now(), text: `expected 402, got ${r.status}` });
        return;
      }
      append({
        kind: 'note',
        ts: Date.now(),
        text: `→ provider asks: ${body.accepts[0].amount} wei, listing #${body.accepts[0].listingId}`,
      });
      setPhase(2);
    } catch (e) {
      append({ kind: 'err', ts: Date.now(), text: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function step2() {
    setBusy(true);
    try {
      append({ kind: 'req', ts: Date.now(), text: 'POST /api/orders' });
      const r = await fetch('/api/orders', { method: 'POST' });
      const body = await r.json();
      append({
        kind: 'res',
        ts: Date.now(),
        text: `${r.status} · orderId=${body.orderId} · price=${body.priceWei} wei`,
      });
      setOrderId(body.orderId);
      append({
        kind: 'note',
        ts: Date.now(),
        text: '→ on real chain: ServiceMarketplace.placeOrder() escrows ETH. on this demo: in-memory order book',
      });
      setPhase(3);
    } catch (e) {
      append({ kind: 'err', ts: Date.now(), text: String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function step3() {
    if (!orderId) return;
    setBusy(true);
    try {
      append({
        kind: 'req',
        ts: Date.now(),
        text: `GET /api/weather/${city}  X-PAYMENT: agentmesh-marketplace;orderId=${orderId}`,
      });
      const r = await fetch(`/api/weather/${encodeURIComponent(city)}`, {
        headers: { 'X-PAYMENT': `agentmesh-marketplace;orderId=${orderId}` },
      });
      const body = await r.json();
      append({
        kind: 'res',
        ts: Date.now(),
        text: `${r.status} · ${JSON.stringify(body).slice(0, 200)}`,
      });
      if (r.status === 200) {
        setData(body);
        setPhase(4);
        append({
          kind: 'note',
          ts: Date.now(),
          text: '→ orderId is now consumed. retry will be rejected (replay protection).',
        });
      } else {
        append({ kind: 'err', ts: Date.now(), text: `request rejected: ${body?.error ?? 'unknown'}` });
      }
    } catch (e) {
      append({ kind: 'err', ts: Date.now(), text: String(e) });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setPhase(0);
    setOrderId(null);
    setLog([]);
    setData(null);
  }

  const buttonForPhase = (() => {
    if (phase === 0)
      return {
        label: '01 · GET /weather (no payment)',
        action: () => {
          setPhase(1);
          step1();
        },
      };
    if (phase === 1) return { label: '⏱ awaiting 402 …', action: null };
    if (phase === 2) return { label: '02 · POST /api/orders', action: step2 };
    if (phase === 3) return { label: '03 · retry with X-PAYMENT', action: step3 };
    return { label: '↻ run again', action: reset };
  })();

  return (
    <section id="try" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading
          kicker="vi · live · real"
          title="try the agent"
          subtitle="real http · no simulation"
        />

        <p className="mt-6 max-w-[60ch] text-[14px] leading-[1.7] text-fg-muted">
          The button below makes a <span className="text-fg">real HTTP request</span> to a Vercel Edge
          Function deployed alongside this site. The function speaks the AgentMesh x402 protocol — it returns
          402, accepts a marketplace orderId, replies with weather, and rejects replay. No chain settlement,
          but every other layer is real.
        </p>

        <div className="mt-12 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-7 space-y-5">
            {/* City input + step button */}
            <div className="flex items-center gap-3">
              <label className="text-[11px] uppercase tracking-[0.22em] text-fg-muted">city</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value.replace(/[^a-zA-Z\s-]/g, '').slice(0, 32))}
                className="bg-bg-card border border-line px-3 py-2 text-sm text-fg outline-none focus:border-phosphor"
                disabled={phase !== 0}
              />
            </div>

            <div>
              <button
                onClick={buttonForPhase.action ?? undefined}
                disabled={!buttonForPhase.action || busy}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonForPhase.label}
              </button>
              {phase > 0 && phase < 4 && (
                <button onClick={reset} className="btn-ghost ml-3">
                  ↻ reset
                </button>
              )}
            </div>

            {/* Phase indicator */}
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em]">
              {(['idle', 'fetched', '402 received', 'order placed', 'paid · 200'] as const).map((s, i) => (
                <span
                  key={s}
                  className={i === phase ? 'text-phosphor' : i < phase ? 'text-fg' : 'text-fg-dim'}
                >
                  {i === phase ? '●' : i < phase ? '✓' : '○'} {s}
                </span>
              ))}
            </div>

            {/* Result panel */}
            {data && (
              <div className="border border-phosphor/40 bg-bg-card p-5 mt-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-phosphor mb-3">
                  ✓ payload received
                </div>
                <div className="grid grid-cols-3 gap-4 text-[13px]">
                  <div>
                    <div className="text-fg-muted text-[10px] uppercase tracking-[0.18em]">city</div>
                    <div className="text-fg text-2xl mt-1">{String(data.city)}</div>
                  </div>
                  <div>
                    <div className="text-fg-muted text-[10px] uppercase tracking-[0.18em]">temp ºc</div>
                    <div className="text-phosphor text-2xl mt-1 tabular-nums">{String(data.tempC)}</div>
                  </div>
                  <div>
                    <div className="text-fg-muted text-[10px] uppercase tracking-[0.18em]">conditions</div>
                    <div className="text-amber text-lg mt-1">{String(data.conditions)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-line text-[10.5px] text-fg-dim">
                  served by <span className="text-fg">{String(data.served_by)}</span> · order{' '}
                  <span className="text-fg">{String(data.orderId)}</span> ·{' '}
                  <span className="text-phosphor">settled</span>
                </div>
              </div>
            )}
          </div>

          {/* Live log */}
          <div className="col-span-12 lg:col-span-5 relative">
            <div className="absolute -top-3 left-6 px-2 bg-bg z-10 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
              <span className="text-phosphor">▮</span> network log
            </div>
            <div ref={logRef} className="code text-[11px] leading-[1.7] h-[420px] overflow-y-auto">
              {log.length === 0 ? (
                <span className="text-fg-dim">&gt; idle. press the button to make a real request.</span>
              ) : (
                log.map((e, i) => <LogLine key={i} entry={e} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const cls =
    entry.kind === 'req'
      ? 'text-amber'
      : entry.kind === 'res'
        ? 'text-phosphor'
        : entry.kind === 'note'
          ? 'text-fg-muted italic'
          : 'text-rust';
  const t = new Date(entry.ts).toISOString().slice(11, 19);
  return (
    <div className="font-mono">
      <span className="text-fg-dim">[{t}]</span> <span className={cls}>{entry.text}</span>
    </div>
  );
}
