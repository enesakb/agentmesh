'use client';

/**
 * The centerpiece. A live protocol simulator that runs the actual end-to-end
 * demo as an animated transcript + a packet-flow diagram. Click "run", watch
 * 22 events fire across 6 layers, packets travel between alpha and beta over
 * labeled lanes, terminal log types itself out.
 *
 * Implementation:
 *  - Single useReducer driving a phase index
 *  - Each event has { layer, from, to, text, delay }
 *  - A phosphor pulse SVG <circle> animates along the active lane via CSS
 *    keyframes; we re-trigger the animation by toggling a key on the lane
 */

import { useEffect, useReducer, useRef } from 'react';
import { SectionHeading } from './Layers';

type Layer = 'identity' | 'wallet' | 'payment' | 'discovery' | 'marketplace' | 'reputation' | 'idle' | 'done';
type Direction = 'a→b' | 'b→a' | 'a' | 'b' | 'both' | 'none';

type Event = {
  layer: Layer;
  dir: Direction;
  text: string;
  delay: number; // ms before NEXT event fires
};

const SCRIPT: Event[] = [
  { layer: 'idle', dir: 'none', text: '$ pnpm demo', delay: 600 },
  {
    layer: 'idle',
    dir: 'none',
    text: '[orch] anvil up · contracts deployed · 7 addresses written',
    delay: 500,
  },

  {
    layer: 'identity',
    dir: 'a',
    text: "[alpha] AgentRegistry.register('demo-alpha', ['data.weather'])",
    delay: 500,
  },
  { layer: 'identity', dir: 'a', text: '[alpha] ✓ identity bound to 0x74De...f633', delay: 400 },
  {
    layer: 'wallet',
    dir: 'a',
    text: '[alpha] AgentAccountFactory.createAccount(salt=1) ⤳ 0x74De...f633',
    delay: 500,
  },
  {
    layer: 'wallet',
    dir: 'a',
    text: '[alpha] SpendingPolicy: 1.0 Ξ / day · 0.5 Ξ / tx · hook installed',
    delay: 500,
  },
  {
    layer: 'marketplace',
    dir: 'a',
    text: '[alpha] ServiceMarketplace.createListing(0.001 Ξ) → listing #5',
    delay: 500,
  },
  { layer: 'idle', dir: 'none', text: '[alpha] http://127.0.0.1:4001/weather/:city  ◾ ready', delay: 500 },

  {
    layer: 'identity',
    dir: 'b',
    text: "[beta] AgentRegistry.register('demo-beta', ['consumer'])",
    delay: 500,
  },
  { layer: 'wallet', dir: 'b', text: '[beta] AgentAccount @ 0xba6e...bc0A · funded 1.0 Ξ', delay: 500 },
  {
    layer: 'discovery',
    dir: 'b→a',
    text: '[beta] findByCapability(data.weather) → [α 0x74De...f633]',
    delay: 500,
  },
  {
    layer: 'marketplace',
    dir: 'b→a',
    text: '[beta] getActiveListingsByProvider(α) → [#5 @ 0.001 Ξ]',
    delay: 450,
  },

  { layer: 'payment', dir: 'b→a', text: '[beta] → GET http://127.0.0.1:4001/weather/Berlin', delay: 400 },
  {
    layer: 'payment',
    dir: 'a→b',
    text: '[alpha] ← 402 Payment Required  accepts:[agentmesh-marketplace]',
    delay: 500,
  },
  {
    layer: 'marketplace',
    dir: 'b→a',
    text: '[beta] placeOrder(5) { value: 0.001 Ξ }   ⟶ orderId = 4 (escrow held)',
    delay: 600,
  },

  {
    layer: 'payment',
    dir: 'b→a',
    text: '[beta] → GET /weather/Berlin   X-PAYMENT: agentmesh-marketplace;orderId=4',
    delay: 500,
  },
  {
    layer: 'payment',
    dir: 'a',
    text: '[alpha] verifyOrder(4) → status=Created · provider matches · price matches',
    delay: 500,
  },
  {
    layer: 'payment',
    dir: 'a→b',
    text: '[alpha] ← 200  { "city":"Berlin", "tempC":20.0, "source":"demo-alpha" }',
    delay: 500,
  },

  {
    layer: 'marketplace',
    dir: 'a',
    text: '[alpha] completeOrder(4, proof=0x7b22...)   ⟶ escrow released',
    delay: 500,
  },
  { layer: 'reputation', dir: 'both', text: '[reputation] α: successCount → 4 · score → 2000', delay: 400 },
  { layer: 'reputation', dir: 'both', text: '[reputation] β: successCount → 4 · score → 2000', delay: 400 },

  { layer: 'done', dir: 'none', text: '✅ end-to-end · six layers · 6.3s', delay: 0 },
];

type State = { running: boolean; idx: number; pulse: number };
type Action = { type: 'start' } | { type: 'tick' } | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start':
      return { running: true, idx: 0, pulse: state.pulse + 1 };
    case 'tick': {
      const nextIdx = state.idx + 1;
      // Final transition: advance the index AND clear running so the
      // replay button enables and the blinking cursor disappears.
      if (nextIdx >= SCRIPT.length - 1) {
        return { running: false, idx: SCRIPT.length - 1, pulse: state.pulse + 1 };
      }
      return { ...state, idx: nextIdx, pulse: state.pulse + 1 };
    }
    case 'reset':
      return { running: false, idx: -1, pulse: state.pulse + 1 };
  }
}

export function LiveProtocol() {
  const [state, dispatch] = useReducer(reducer, { running: false, idx: -1, pulse: 0 });
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.running) return;
    const ev = SCRIPT[state.idx];
    if (!ev) return;
    if (state.idx >= SCRIPT.length - 1) return;
    const t = setTimeout(() => dispatch({ type: 'tick' }), ev.delay);
    return () => clearTimeout(t);
  }, [state.running, state.idx]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.idx]);

  const visibleLog = state.idx < 0 ? [] : SCRIPT.slice(0, state.idx + 1);
  const current = state.idx >= 0 ? SCRIPT[state.idx] : null;

  return (
    <section id="live" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading
          kicker="vi — try it"
          title="run the protocol"
          subtitle="22 events · 6 layers · live"
        />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          {/* Diagram */}
          <div className="col-span-12 lg:col-span-7 relative">
            <div className="border border-line bg-bg-card p-6 lg:p-8 relative overflow-hidden">
              <div className="absolute top-3 right-4 text-[10px] uppercase tracking-[0.22em] text-fg-dim">
                <span className="text-phosphor">▮</span> wire
              </div>
              <Diagram current={current} pulse={state.pulse} />

              <div className="mt-6 pt-4 border-t border-line text-[11px] uppercase tracking-[0.2em] text-fg-muted flex flex-wrap items-center gap-x-6 gap-y-2">
                <span>
                  state <span className="dot-leader inline-block w-3 mx-1 align-middle h-px" />
                  {state.running ? (
                    <span className="text-phosphor">running</span>
                  ) : state.idx < 0 ? (
                    <span className="text-fg">idle</span>
                  ) : state.idx >= SCRIPT.length - 1 ? (
                    <span className="text-amber">complete</span>
                  ) : (
                    <span className="text-amber">paused</span>
                  )}
                </span>
                <span>
                  step <span className="dot-leader inline-block w-3 mx-1 align-middle h-px" />
                  <span className="text-fg">
                    {Math.max(0, state.idx + 1)} / {SCRIPT.length}
                  </span>
                </span>
                <span>
                  layer <span className="dot-leader inline-block w-3 mx-1 align-middle h-px" />
                  <span className="text-fg">{current?.layer ?? '—'}</span>
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => dispatch({ type: 'start' })}
                className="btn-primary disabled:opacity-50"
                disabled={state.running}
              >
                <span>▶</span> {state.idx >= SCRIPT.length - 1 && !state.running ? 'replay' : 'run demo'}
              </button>
              <button onClick={() => dispatch({ type: 'reset' })} className="btn-ghost">
                ↻ reset
              </button>
              <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-fg-dim">
                no real funds · simulated transcript of the actual demo
              </span>
            </div>
          </div>

          {/* Terminal log */}
          <div className="col-span-12 lg:col-span-5 relative">
            <div className="absolute top-3 left-6 px-2 bg-bg z-10 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
              <span className="text-phosphor">▮</span> /tmp/agentmesh-demo.log
            </div>
            <div
              ref={logRef}
              className="code text-[11.5px] leading-[1.7] h-[480px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              {visibleLog.length === 0 ? (
                <span className="text-fg-dim">
                  &gt; press <span className="text-phosphor">run demo</span> to begin.
                  <br />
                  <br />
                  <span className="text-fg-muted">// transcript drawn from the actual demo run</span>
                </span>
              ) : (
                visibleLog.map((e, i) => <LogLine key={i} text={e.text} layer={e.layer} />)
              )}
              {state.running && (
                <span className="inline-block w-2 h-[14px] bg-phosphor align-middle blink ml-1" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const LAYER_COLOR: Record<Layer, string> = {
  identity: 'text-phosphor',
  wallet: 'text-phosphor',
  payment: 'text-amber',
  discovery: 'text-phosphor',
  marketplace: 'text-amber',
  reputation: 'text-phosphor',
  idle: 'text-fg-muted',
  done: 'text-phosphor',
};

function LogLine({ text, layer }: { text: string; layer: Layer }) {
  return (
    <div className="font-mono">
      <span className={LAYER_COLOR[layer] + ' opacity-90'}>{text}</span>
    </div>
  );
}

// Diagram layout (viewBox 760×340):
//   Alpha node centered at x=70, beta node centered at x=690.
//   Lanes run from x=120 to x=640. Labels are centered ABOVE each lane (no
//   collision with the nodes), so the diagram stays readable at every step.
const LAYERS: { key: Layer; label: string; y: number }[] = [
  { key: 'identity', label: '01  identity', y: 80 },
  { key: 'wallet', label: '02  wallet', y: 130 },
  { key: 'payment', label: '03  payment', y: 180 },
  { key: 'discovery', label: '04  discovery', y: 230 },
  { key: 'marketplace', label: '05  marketplace', y: 280 },
];
// (reputation rendered separately below the lanes for clarity — it's an
//  outcome, not a wire-level lane)

const X_LEFT = 120;
const X_RIGHT = 640;
const ALPHA_X = 70;
const BETA_X = 690;
const NODE_Y = 200;

function Diagram({ current, pulse }: { current: Event | null; pulse: number }) {
  const activeLayer = current?.layer ?? null;
  const dir = current?.dir ?? 'none';
  const repActive = activeLayer === 'reputation';

  return (
    <svg viewBox="0 0 760 360" className="w-full h-auto" role="img" aria-label="protocol diagram">
      <defs>
        <filter id="phosphorGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* lanes */}
      {LAYERS.map((l) => {
        const isActive = activeLayer === l.key;
        return (
          <g key={l.key}>
            {/* label, sitting just above the lane, centered between the nodes */}
            <text
              x={(X_LEFT + X_RIGHT) / 2}
              y={l.y - 8}
              textAnchor="middle"
              fill={isActive ? '#b8ff3a' : '#7a7a73'}
              fontSize="10"
              letterSpacing="1.5"
              fontFamily="JetBrains Mono, monospace"
            >
              {l.label}
            </text>
            <line
              x1={X_LEFT}
              x2={X_RIGHT}
              y1={l.y}
              y2={l.y}
              stroke={isActive ? '#b8ff3a' : '#2c3134'}
              strokeWidth={isActive ? 1.5 : 1}
              strokeDasharray={isActive ? '0' : '4 4'}
              opacity={isActive ? 0.9 : 0.5}
            />

            {/* phosphor pulse along the active lane */}
            {isActive && (dir === 'a→b' || dir === 'b→a') && (
              <circle key={`pulse-${pulse}-${l.key}`} r="5" fill="#b8ff3a" filter="url(#phosphorGlow)">
                <animate
                  attributeName="cx"
                  from={dir === 'a→b' ? X_LEFT : X_RIGHT}
                  to={dir === 'a→b' ? X_RIGHT : X_LEFT}
                  dur="0.9s"
                  fill="freeze"
                  begin="0s"
                />
                <animate attributeName="cy" from={l.y} to={l.y} dur="0.9s" fill="freeze" />
                <animate attributeName="opacity" from="1" to="0" dur="0.9s" fill="freeze" />
              </circle>
            )}
          </g>
        );
      })}

      {/* reputation rail — drawn below the lane stack, double-line for emphasis */}
      <g>
        <text
          x={(X_LEFT + X_RIGHT) / 2}
          y={328}
          textAnchor="middle"
          fill={repActive ? '#b8ff3a' : '#7a7a73'}
          fontSize="10"
          letterSpacing="1.5"
          fontFamily="JetBrains Mono, monospace"
        >
          06 reputation ← outcome
        </text>
        <line
          x1={X_LEFT}
          x2={X_RIGHT}
          y1={338}
          y2={338}
          stroke={repActive ? '#b8ff3a' : '#2c3134'}
          strokeWidth={repActive ? 1.5 : 1}
          strokeDasharray={repActive ? '0' : '2 6'}
          opacity={repActive ? 0.9 : 0.4}
        />
      </g>

      {/* nodes — well clear of the labels */}
      <Node
        x={ALPHA_X}
        y={NODE_Y}
        label="α  alpha"
        sub="provider"
        active={dir === 'a' || dir === 'a→b' || dir === 'both'}
      />
      <Node
        x={BETA_X}
        y={NODE_Y}
        label="β  beta"
        sub="consumer"
        active={dir === 'b' || dir === 'b→a' || dir === 'both'}
      />

      {/* fan-in connectors from nodes to the lane bus endpoints */}
      <path
        d={`M ${ALPHA_X} ${NODE_Y} L ${X_LEFT} 80 M ${ALPHA_X} ${NODE_Y} L ${X_LEFT} 280`}
        stroke="#1d2123"
        strokeWidth="0.7"
        fill="none"
      />
      <path
        d={`M ${BETA_X} ${NODE_Y} L ${X_RIGHT} 80 M ${BETA_X} ${NODE_Y} L ${X_RIGHT} 280`}
        stroke="#1d2123"
        strokeWidth="0.7"
        fill="none"
      />

      {/* baseline */}
      <text
        x={380}
        y={356}
        textAnchor="middle"
        fontSize="9"
        letterSpacing="2"
        fill="#4a4a45"
        fontFamily="JetBrains Mono, monospace"
      >
        AGENTMESH · WIRE FORMAT · v0.1
      </text>
    </svg>
  );
}

function Node({
  x,
  y,
  label,
  sub,
  active,
}: { x: number; y: number; label: string; sub: string; active: boolean }) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={active ? 22 : 18}
        fill={active ? '#0e1112' : '#0e1112'}
        stroke={active ? '#b8ff3a' : '#2c3134'}
        strokeWidth={active ? 1.5 : 1}
        filter={active ? 'url(#phosphorGlow)' : undefined}
      />
      <circle cx={x} cy={y} r={3} fill={active ? '#b8ff3a' : '#7a7a73'} />
      <text
        x={x}
        y={y - 32}
        textAnchor="middle"
        fontSize="11"
        fill={active ? '#b8ff3a' : '#ecece6'}
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="0.5"
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 36}
        textAnchor="middle"
        fontSize="9"
        fill="#7a7a73"
        fontFamily="JetBrains Mono, monospace"
        letterSpacing="1.5"
      >
        {sub.toUpperCase()}
      </text>
    </g>
  );
}
