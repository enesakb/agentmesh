// Long-form editorial section. Multi-column layout, drop cap, pull quote.
// Writes the bet behind the protocol in plain language.
import { SectionHeading } from './Layers';

export function Manifesto() {
  return (
    <section id="manifesto" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="vii — manifest" title="why this exists" subtitle="2026 · the year agents got wallets" />

        <div className="mt-14 lg:mt-20 grid grid-cols-12 gap-8 lg:gap-12">
          {/* Lede */}
          <div className="col-span-12 lg:col-span-3 text-[12px] uppercase tracking-[0.22em] text-fg-muted leading-relaxed">
            <div className="border-l-2 border-phosphor pl-4">
              ╴a short essay on why a six-layer protocol stack is the right shape for the agent economy, written
              from inside the implementation.
            </div>
            <div className="mt-8 text-fg-dim text-[10px]">
              ─── est. read · 4 min
              <br />
              author <span className="text-fg">/ enes</span>
              <br />
              filed <span className="text-fg">/ 2026.05.09</span>
            </div>
          </div>

          {/* The body — 2-column inside the right 9 cols */}
          <article className="col-span-12 lg:col-span-9 manifesto-body text-[15px] leading-[1.78] text-fg/90">
            <p className="first-letter:font-display first-letter:text-[120px] first-letter:leading-[0.8] first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-phosphor first-letter:font-light">
              For the last twenty years, the unit of economic action online has been{' '}
              <em>the human with a credit card</em>. Stripe, AWS, App Store — all the rails assume a person at the
              keyboard, an account opened in a name, a card in a wallet. When AI agents started running on their
              own — drafting code, monitoring markets, scheduling tasks — they inherited none of those rails.
              They couldn&apos;t hold money, couldn&apos;t prove who they were, couldn&apos;t pay each other
              without a human standing behind them.
            </p>

            <p className="mt-5">
              This is the choke point. An AI agent that must call back to OpenAI&apos;s billing system every
              time it needs another agent&apos;s data is not autonomous; it is a Mechanical Turk wearing a
              transformer suit. The platforms get every transaction. The agents get nothing they can stake or
              build on.
            </p>

            <PullQuote>
              An agent that cannot prove its own history is a Mechanical Turk in a transformer suit.
            </PullQuote>

            <h3 className="mt-10 font-display font-light text-[36px] tracking-[-0.02em] leading-[1] text-fg">
              the six things every agent needs
            </h3>

            <p className="mt-4">
              Walk forward from first principles. An autonomous agent that wants to participate in a market
              needs <span className="text-phosphor">six</span> things, and they decompose cleanly:
            </p>

            <ol className="mt-4 space-y-2 text-fg-muted text-[14px] leading-[1.7] list-none pl-0">
              <li>
                <span className="text-phosphor mr-2">01</span> A name and a capability set, anchored to a key it
                controls. <span className="text-fg">Identity.</span>
              </li>
              <li>
                <span className="text-phosphor mr-2">02</span> A wallet that holds value and obeys policies the
                agent (or its owner) wrote. <span className="text-fg">Wallet.</span>
              </li>
              <li>
                <span className="text-phosphor mr-2">03</span> A way to pay another agent inline, over the same
                HTTP it already speaks. <span className="text-fg">Payment.</span>
              </li>
              <li>
                <span className="text-phosphor mr-2">04</span> A way to find another agent without a directory
                operator skimming. <span className="text-fg">Discovery.</span>
              </li>
              <li>
                <span className="text-phosphor mr-2">05</span> A market with escrow and refunds, so neither side
                is begging. <span className="text-fg">Marketplace.</span>
              </li>
              <li>
                <span className="text-phosphor mr-2">06</span> A history both sides can verify without trusting a
                review platform. <span className="text-fg">Reputation.</span>
              </li>
            </ol>

            <p className="mt-6">
              These six are not optional. Skip identity and you get pseudonymous bots that can&apos;t be banned
              when they misbehave. Skip the wallet and the agent can&apos;t hold its earnings. Skip payment and
              you&apos;re back to humans with cards. Skip discovery and you need a centralised directory; that
              directory becomes the platform; the platform takes its cut. Skip the marketplace and you&apos;re
              trusting a stranger. Skip reputation and there is no incentive to behave well over time.
            </p>

            <h3 className="mt-12 font-display font-light text-[36px] tracking-[-0.02em] leading-[1] text-fg">
              the existing piecework
            </h3>

            <p className="mt-4">
              Each of these six layers <em>has</em> been attempted, but never together. Coinbase&apos;s x402 is
              the cleanest payment standard, beautiful in its choice to overload an existing HTTP status code
              instead of inventing a new one. ai16z&apos;s Eliza ships agent personalities and a plugin system
              but treats payment as someone else&apos;s problem. Virtuals tokenises agents but locks them inside
              a single launchpad. Olas runs bounties but its reputation system is implicit. Pimlico hands you a
              bundler but stops at the wallet; what does the wallet pay <em>for</em>?
            </p>

            <PullQuote>
              Six islands. None of them produce an economy. An economy is the bridges.
            </PullQuote>

            <p className="mt-4">
              You can stitch them together. People do. Stitching produces a graveyard of glue projects, each
              custom, each fragile, each rotten under the next protocol upgrade. The economy lives in the
              bridges. We built the bridges.
            </p>

            <h3 className="mt-12 font-display font-light text-[36px] tracking-[-0.02em] leading-[1] text-fg">
              what AgentMesh actually is
            </h3>

            <p className="mt-4">
              AgentMesh is one stack with one wire format covering all six layers. The contracts are minimal on
              purpose — every load-bearing decision is an ADR you can read in twenty minutes. The wallet runs
              under both ERC-4337 and direct EOA paths so a developer can demo on local anvil today and ship to
              Polygon Amoy with the same code. Payment piggybacks on HTTP 402, but settlement is bound to a
              marketplace order so escrow and reputation come along for the ride.
            </p>

            <p className="mt-4">
              The whole thing is sixteen Solidity files, four TypeScript packages, two demo agents, and a script
              that proves the loop closes: alpha registers, beta finds alpha, beta pays alpha, alpha serves
              data, escrow releases, both sides accrue verifiable reputation. Six layers, one transcript.
            </p>

            <p className="mt-4 text-fg">
              <span className="text-amber">▮</span> Not a platform. Not a launchpad. A protocol other people
              build platforms <em>on</em>. The bet is that in 2026 the agent economy is bottlenecked by missing
              public infrastructure, not by missing AI capability.
            </p>

            <p className="mt-8 pt-6 border-t border-line text-fg-muted text-[12px] uppercase tracking-[0.22em]">
              ─── filed under: protocol, agents, autonomy, public infrastructure
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="my-10 lg:my-14 font-display font-light text-[40px] lg:text-[56px] leading-[0.98] tracking-[-0.025em] text-fg border-l-4 border-phosphor pl-6 lg:pl-8"
      style={{ fontVariationSettings: '"SOFT" 70, "WONK" 1, "opsz" 144' }}
    >
      <span className="text-phosphor">“</span>
      {children}
      <span className="text-phosphor">”</span>
    </blockquote>
  );
}
