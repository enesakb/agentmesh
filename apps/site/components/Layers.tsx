import { Reveal } from './Reveal';
import { Tilt } from './Tilt';

// Six layers — vertical editorial table, each row a chapter.
// Each layer carries: number, name (large display serif), contract/package, key signature.
type Layer = {
  n: string;
  name: string;
  artifact: string;
  blurb: string;
  signature: string;
  tag: string;
};

const layers: Layer[] = [
  {
    n: '01',
    name: 'Identity',
    artifact: 'AgentRegistry.sol',
    blurb:
      'Unique on-chain name + capability set per agent, indexed by keccak256(capability). ERC-8004-compatible surface.',
    signature: 'register(name, metadataURI, bytes32[] capabilities) → registeredAt',
    tag: 'on-chain',
  },
  {
    n: '02',
    name: 'Wallet',
    artifact: 'AgentAccount.sol + Factory',
    blurb:
      'Modular smart account. ERC-4337 v0.7 dual-path (EOA today, bundler tomorrow). ERC-7579 hook list. EIP-1167 deterministic deploy.',
    signature: 'execute(target, value, data) — onlyOwnerOrEntryPoint',
    tag: 'erc-4337 / 7579',
  },
  {
    n: '03',
    name: 'Payment',
    artifact: '@agentmesh/x402-server, x402-client',
    blurb:
      'HTTP 402 Payment Required, marketplace-bound settlement. Replay-protected per middleware. Express + viem.',
    signature: 'X-PAYMENT: agentmesh-marketplace;orderId=<n>',
    tag: 'x402 + escrow',
  },
  {
    n: '04',
    name: 'Discovery',
    artifact: 'AgentRegistry.findByCapability',
    blurb: 'Capability hash → agent address list. Deterministic, no off-chain index in MVP.',
    signature: 'findByCapability(bytes32) → address[]',
    tag: 'on-chain index',
  },
  {
    n: '05',
    name: 'Marketplace',
    artifact: 'ServiceMarketplace.sol',
    blurb:
      'Native-ETH escrow. Provider completes within ORDER_TIMEOUT (1h) or consumer can refund. No oracle, no jury — yet.',
    signature: 'placeOrder(listingId) payable → orderId',
    tag: 'escrow',
  },
  {
    n: '06',
    name: 'Reputation',
    artifact: 'ReputationRegistry.sol',
    blurb:
      "Append-only. score = (successRate · √min(N,100)) / 10. Fed by marketplace events. Sybils can't fake history cheaply.",
    signature: 'getReputationScore(agent) → uint256 // 0..10000',
    tag: 'append-only',
  },
];

export function LayersSection() {
  return (
    <section id="layers" className="relative py-24 lg:py-32 bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="ii — protocol surface" title="six layers" subtitle="0×01 → 0×06" />

        <div className="mt-12 lg:mt-16 border-t border-line">
          {layers.map((l, idx) => (
            <Reveal key={l.n} from="up" delay={idx * 90}>
              <Tilt intensity={3.5} className="block">
                <a
                  href={`#layer-${l.n}`}
                  id={`layer-${l.n}`}
                  className="layer-row group block border-b border-line"
                >
                  <div className="grid grid-cols-12 gap-6 px-2 lg:px-6 py-8 lg:py-12">
                    <div className="col-span-12 md:col-span-1 text-[11px] uppercase tracking-[0.22em] text-fg-muted">
                      <div className="text-phosphor">{l.n}</div>
                      <div className="mt-1 text-fg-dim">/ 06</div>
                    </div>

                    <div className="col-span-12 md:col-span-5">
                      <h3
                        className="font-display font-light text-[44px] md:text-[64px] leading-[0.95] tracking-[-0.03em]"
                        style={{ fontVariationSettings: '"SOFT" 70, "WONK" 1, "opsz" 144' }}
                      >
                        {l.name}
                        <span className="layer-arrow inline-block ml-3 text-fg-muted text-[0.4em] align-middle">
                          ↘
                        </span>
                      </h3>
                      <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-amber bracketed">
                        {l.tag}
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-fg-muted mb-3">
                        artifact
                        <span className="dot-leader text-fg-dim inline-block w-12 mx-3 align-middle h-px" />
                        <span className="text-fg normal-case tracking-normal text-[13px]">{l.artifact}</span>
                      </div>
                      <p className="text-[14px] leading-[1.7] text-fg-muted max-w-[58ch]">{l.blurb}</p>
                      <pre className="mt-5 text-[12px] text-fg-dim border-l-2 border-phosphor/40 pl-3 overflow-x-auto">
                        <span className="text-phosphor">{'>'}</span> {l.signature}
                      </pre>
                    </div>
                  </div>
                </a>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div>
        <div className="text-[11px] uppercase tracking-[0.32em] text-amber mb-3">
          <span className="text-phosphor">▮</span> {kicker}
        </div>
        <h2
          className="font-display font-light text-[64px] lg:text-[120px] leading-[0.85] tracking-[-0.04em]"
          style={{ fontVariationSettings: '"SOFT" 30, "WONK" 1, "opsz" 144' }}
        >
          {title}
        </h2>
      </div>
      {subtitle && <div className="text-[11px] uppercase tracking-[0.22em] text-fg-muted">{subtitle}</div>}
    </div>
  );
}
