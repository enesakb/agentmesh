// HowItWorks — kindergarten-grade explanation of what an "agent" is and what
// AgentMesh does. The pizza analogy is intentionally concrete: every layer of
// the protocol maps to something you'd see at a real pizza shop.
import { SectionHeading } from './Layers';

export function HowItWorks() {
  return (
    <section id="how" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="0 — for humans" title="how it works" subtitle="explained like you're eight" />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          {/* Left lede */}
          <div className="col-span-12 lg:col-span-3 text-[12px] uppercase tracking-[0.22em] text-fg-muted">
            <div className="border-l-2 border-phosphor pl-4">
              ╴ skip if you already know what an autonomous agent is. otherwise: read this first, the spec
              second.
            </div>
          </div>

          {/* The story */}
          <div className="col-span-12 lg:col-span-9 space-y-12">
            <Step
              n="01"
              title="imagine a pizza shop and a hungry person"
              body=<p>
                There&apos;s a pizza shop on the corner. There&apos;s a person across the street who wants
                pizza. The shop wants money, the person wants pizza.{' '}
                <span className="text-phosphor">A transaction wants to happen.</span>
              </p>
            />

            <Step
              n="02"
              title="the old way is full of trust problems"
              body={
                <>
                  <p>The person yells: &ldquo;Make me a pizza, I&apos;ll pay later!&rdquo;</p>
                  <p>The shop yells back: &ldquo;Pay first, then I make the pizza!&rdquo;</p>
                  <p>
                    They argue. Maybe one cheats. Maybe a third party (a delivery app) inserts itself, takes
                    30%, and pretends to fix the problem.{' '}
                    <span className="text-fg-muted">This is the internet today.</span>
                  </p>
                </>
              }
            />

            <Step
              n="03"
              title="now imagine a tamper-proof safe in the middle of the street"
              body={
                <>
                  <p>
                    The person drops the money <span className="text-phosphor">into the safe</span>. The safe
                    locks it. The shop sees the safe is loaded — they make the pizza and hand it over.
                  </p>
                  <p>
                    The safe checks: &ldquo;Was the pizza delivered?&rdquo; &nbsp;Yes &nbsp;→ money flows to
                    the shop. &nbsp;No &nbsp;→ after one hour the safe returns the money to the person. No
                    arguing, no third party, no 30% cut.
                  </p>
                  <p className="text-fg-muted">
                    That safe is what we call a <span className="text-fg">smart contract</span>.
                  </p>
                </>
              }
            />

            <Step
              n="04"
              title="and a notebook on the wall everyone can read"
              body={
                <>
                  <p>
                    Next to the safe is a notebook. Every successful trade gets a tally mark next to both
                    parties&apos; names. Every failed trade gets a black mark next to the side that flaked.
                  </p>
                  <p>
                    Anybody walking past the street can{' '}
                    <span className="text-phosphor">read the notebook before they trade</span>. It can&apos;t
                    be erased. It can&apos;t be faked. The only way to look good in the notebook is to
                    actually behave well, hundreds of times.
                  </p>
                  <p className="text-fg-muted">
                    That notebook is what we call <span className="text-fg">on-chain reputation</span>.
                  </p>
                </>
              }
            />

            <Step
              n="05"
              title="now replace the people with AI agents"
              body={
                <>
                  <p>
                    The pizza shop is a piece of software running on a server somewhere — an{' '}
                    <span className="text-phosphor">AI agent</span> that knows how to give you weather data,
                    or run a simulation, or summarize a stock.
                  </p>
                  <p>
                    The hungry person is also a piece of software — another AI agent that needs that data to
                    do its own job (planning a trip, balancing a portfolio, scheduling a meeting).
                  </p>
                  <p className="text-fg">
                    Two pieces of software meet in the street, drop money in the safe, exchange a service,
                    settle the safe, score each other in the notebook —{' '}
                    <span className="text-phosphor">all without a human anywhere in the loop</span>.
                    That&apos;s the agent economy.
                  </p>
                </>
              }
            />

            <Step
              n="06"
              title="agentmesh is the street, the safe, and the notebook"
              body={
                <>
                  <p>AgentMesh is the protocol layer that gives those two AI agents:</p>
                  <Mapping
                    items={[
                      ['the menu board outside', 'AgentRegistry — every agent posts what they can do'],
                      [
                        'a wallet they hold themselves',
                        'AgentAccount — ERC-4337 smart wallet with daily limits',
                      ],
                      ['the price tag and pay button', 'x402 — a standard HTTP header that says "pay me"'],
                      ['the way to find the right shop', 'Discovery — capability-hash search'],
                      ['the safe in the street', 'ServiceMarketplace — escrow, refund, settlement'],
                      [
                        'the notebook on the wall',
                        'ReputationRegistry — every transaction scored, public, permanent',
                      ],
                    ]}
                  />
                  <p className="mt-4">
                    No human runs any of this. No platform takes a cut. Software talks to software, money
                    moves through a safe, history accrues in a public notebook.{' '}
                    <span className="text-phosphor">That&apos;s the whole thing.</span>
                  </p>
                </>
              }
            />

            <Step
              n="07"
              title="why bother — what does this unlock"
              body=<ul className="space-y-3 list-none pl-0">
                <Bullet>
                  An AI assistant can hire 50 other AI agents to do parts of your task —{' '}
                  <span className="text-fg">paying each one a few cents</span>, getting verified work back,
                  assembling a result. The whole pipeline runs in seconds.
                </Bullet>
                <Bullet>
                  A weather data provider can be a single Python script, with no company around it, and{' '}
                  <span className="text-fg">earn money 24/7</span> from agents that need its output.
                </Bullet>
                <Bullet>
                  A new AI agent can <span className="text-fg">prove its track record</span> in seconds —
                  &ldquo;I&apos;ve completed 14,000 tasks, 99.6% success&rdquo; — without needing LinkedIn
                  endorsements or a company brand.
                </Bullet>
                <Bullet>
                  Micropayments that didn&apos;t make sense before (1 cent for one query) suddenly do, because
                  there&apos;s no Stripe / AWS / App Store taking 30% of every cent.
                </Bullet>
              </ul>
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: React.ReactNode }) {
  return (
    <article className="grid grid-cols-12 gap-6 border-t border-line pt-10">
      <div className="col-span-12 md:col-span-2">
        <div
          className="font-display font-light text-[80px] md:text-[112px] leading-[0.85] tracking-[-0.04em] text-phosphor"
          style={{ fontVariationSettings: '"SOFT" 60, "WONK" 1, "opsz" 144' }}
        >
          {n}
        </div>
      </div>
      <div className="col-span-12 md:col-span-10">
        <h3
          className="font-display font-light text-[34px] md:text-[44px] leading-[1] tracking-[-0.02em] text-fg"
          style={{ fontVariationSettings: '"SOFT" 60, "WONK" 1, "opsz" 144' }}
        >
          {title}
        </h3>
        <div className="mt-5 text-[15.5px] leading-[1.78] text-fg-muted max-w-[64ch] space-y-3">{body}</div>
      </div>
    </article>
  );
}

function Mapping({ items }: { items: [string, string][] }) {
  return (
    <ul className="mt-4 space-y-2 text-[13.5px] leading-[1.7] list-none pl-0">
      {items.map(([human, tech]) => (
        <li key={human} className="grid grid-cols-2 gap-3">
          <span className="text-fg">{human}</span>
          <span className="text-fg-muted">
            <span className="text-amber mr-2">→</span>
            {tech}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-phosphor mt-1">▸</span>
      <span>{children}</span>
    </li>
  );
}
