import { SectionHeading } from './Layers';

const points = [
  {
    n: 'i',
    title: 'composable',
    body: 'Six layers, one stack. No glue project required. Identity is just a registry; payment is just a header; reputation is a side-effect of completed orders. Replace any layer; the wire format does not break.',
    metric: '6 / 6',
  },
  {
    n: 'ii',
    title: 'dual-path',
    body: 'The same AgentAccount is callable directly by an EOA on local anvil and via an ERC-4337 bundler on Polygon Amoy. Build today, scale tomorrow — without rewriting the demo.',
    metric: 'erc-4337 v0.7',
  },
  {
    n: 'iii',
    title: 'verifiable',
    body: 'Escrow + on-chain reputation + replay-protected x402. No honor system. The protocol enforces what an autonomous agent can prove, not what the operator promises.',
    metric: 'on-chain',
  },
];

export function Why() {
  return (
    <section id="why" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="v — why this shape" title="why" subtitle="three load-bearing decisions" />

        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-16">
          {points.map((p) => (
            <article key={p.n} className="relative">
              <div
                className="font-display font-light text-[120px] leading-[0.8] tracking-[-0.05em] text-phosphor opacity-80"
                style={{ fontVariationSettings: '"SOFT" 80, "WONK" 1, "opsz" 144' }}
              >
                {p.n}
              </div>
              <h3
                className="mt-4 font-display font-normal text-[44px] tracking-[-0.03em] text-fg"
                style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1, "opsz" 144' }}
              >
                {p.title}
              </h3>
              <p className="mt-5 text-[14px] leading-[1.7] text-fg-muted max-w-[42ch]">{p.body}</p>
              <div className="mt-6 pt-3 border-t border-line text-[10px] uppercase tracking-[0.22em] text-fg-muted">
                metric
                <span className="dot-leader text-fg-dim inline-block w-12 mx-2 align-middle h-px" />
                <span className="text-amber">{p.metric}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
