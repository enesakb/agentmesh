'use client';

import { SectionHeading } from './Layers';

const QA: { q: string; a: React.ReactNode }[] = [
  {
    q: 'Why not just use Stripe?',
    a: (
      <>
        Stripe assumes a human with a card. Two AI agents transacting with each other can&apos;t open Stripe
        accounts; even if they could, the platform takes a cut of every micropayment. AgentMesh runs at the
        protocol level — no platform, no KYC, no account opening. The fee is the gas; the rule is the contract.
      </>
    ),
  },
  {
    q: 'Why not Coinbase x402 alone?',
    a: (
      <>
        x402 is the cleanest payment header we&apos;ve seen, and we adopt the spec. But x402 is one layer.
        Without identity, discovery, escrow, and reputation, you have a payment with no economy around it.
        AgentMesh is x402 + the missing five layers, glued so the same orderId carries across all of them.
      </>
    ),
  },
  {
    q: 'Is this audited?',
    a: (
      <>
        No. v0.1 is an MVP — every contract has a Foundry test suite (64 tests), critical paths hit 100%
        coverage, and there are 6 ADRs documenting load-bearing decisions. But formal audit is on the roadmap
        between v0.2 and v1.0. Until then: <span className="text-amber">don&apos;t deploy to mainnet</span>.
      </>
    ),
  },
  {
    q: 'How is this different from ai16z / Virtuals / Olas?',
    a: (
      <>
        Each of those is excellent at 1–2 layers. ai16z is great at agent <em>behaviour</em> (Eliza framework).
        Virtuals tokenises agents inside a launchpad. Olas does bounty marketplaces. None of them solve the full
        six-layer stack, and most of them deliberately keep agents inside a walled garden. See the{' '}
        <a href="#compare" className="text-phosphor underline-offset-4 hover:underline">
          comparison matrix
        </a>{' '}
        for cell-level detail.
      </>
    ),
  },
  {
    q: "What's an 'agent' exactly, in this protocol?",
    a: (
      <>
        Anything that controls a smart account. In practice this is usually an LLM-driven process running on a
        server — but it could be a piece of firmware, a Solana validator, or your friend Bob with a CLI. The
        protocol doesn&apos;t care. It only sees the on-chain identity and the messages signed by it.
      </>
    ),
  },
  {
    q: 'Can humans use this directly?',
    a: (
      <>
        Yes. There&apos;s nothing agent-specific in the contracts themselves. A human running the SDK can
        register, list services, and consume them exactly the same way. AgentMesh is named for its primary
        market, not its only audience.
      </>
    ),
  },
  {
    q: 'What happens if an agent goes rogue and drains its wallet?',
    a: (
      <>
        Two safety nets ship in v0.1: a <span className="text-fg">SpendingPolicyModule</span> hook (daily limit
        + per-tx limit + target blacklist, enforced before every <code>execute</code>) and a{' '}
        <span className="text-fg">RecoveryModule</span> (Argent-style M-of-N guardian recovery with a 48h
        timelock, owner can cancel). Neither is bulletproof. Both raise the bar.
      </>
    ),
  },
  {
    q: "What's the licence?",
    a: (
      <>
        MIT. Use it, fork it, sell it. Attribution appreciated, not required. If you ship a real product on it,
        we&apos;d love to hear about it on the GitHub issues — but you owe us nothing.
      </>
    ),
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="ix — questions" title="faq" subtitle="ctrl+f friendly" />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-3 text-[12px] leading-[1.7] text-fg-muted">
            <p className="border-l-2 border-line-bright pl-4">
              Eight questions that reliably arrive within a minute of seeing the demo. Click to expand.
            </p>
            <div className="mt-8 text-[10px] uppercase tracking-[0.22em] text-fg-dim leading-relaxed">
              ─── total · {QA.length}
              <br />
              avg · ~80 words
              <br />
              honest · always
            </div>
          </div>

          <div className="col-span-12 lg:col-span-9">
            {QA.map((item, i) => (
              <details
                key={i}
                className="group border-b border-line py-6 cursor-pointer"
                {...(i === 0 ? { open: true } : {})}
              >
                <summary className="flex items-baseline gap-4 list-none [&::-webkit-details-marker]:hidden">
                  <span className="text-[11px] text-phosphor uppercase tracking-[0.22em] mt-1">
                    {(i + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-[20px] lg:text-[22px] text-fg group-hover:text-phosphor transition-colors leading-tight">
                    {item.q}
                  </span>
                  <span className="text-fg-muted text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <div className="mt-4 ml-10 max-w-[68ch] text-[14px] leading-[1.75] text-fg-muted">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
