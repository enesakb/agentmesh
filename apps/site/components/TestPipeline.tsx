import { SectionHeading } from './Layers';

// Verifiable test results pulled from CI / local runs. Numbers below are real,
// reported by the actual test runners. See /docs/test-results.md in the repo.
const RESULTS = [
  {
    bucket: 'Foundry · Solidity',
    items: [
      { name: 'AgentRegistry.t.sol', n: 13, status: 'pass' },
      { name: 'AgentAccount.t.sol', n: 11, status: 'pass' },
      { name: 'SpendingPolicyModule.t.sol', n: 7, status: 'pass' },
      { name: 'RecoveryModule.t.sol', n: 7, status: 'pass' },
      { name: 'ServiceMarketplace.t.sol', n: 14, status: 'pass' },
      { name: 'ReputationRegistry.t.sol', n: 11, status: 'pass' },
      { name: 'Integration.t.sol', n: 1, status: 'pass' },
      { name: 'LoadTest.t.sol  (50p · 50c · 200 orders)', n: 2, status: 'pass' },
    ],
    total: 66,
  },
  {
    bucket: 'Vitest · TypeScript',
    items: [
      { name: '@agentmesh/shared', n: 4, status: 'pass' },
      { name: '@agentmesh/x402-server', n: 23, status: 'pass' },
      { name: '@agentmesh/x402-client', n: 6, status: 'pass' },
    ],
    total: 33,
  },
  {
    bucket: 'End-to-end',
    items: [
      { name: 'pnpm demo · alpha + beta on local anvil', n: 1, status: 'pass' },
      { name: 'forge coverage · marketplace + factory', n: 1, status: '100%' },
    ],
    total: 2,
  },
];

const INVARIANTS = [
  'marketplace.balance == 0 after every order resolves',
  'reputation.successCount == 2 × completedOrders (both sides logged)',
  'reputation.failureCount == refundedOrders (provider only)',
  'registry.totalAgents == sum of unique register() calls',
  'orderId is monotonic and never re-used',
  'completeOrder requires status=Created AND msg.sender=provider',
  'refundOrder requires status=Created AND block.timestamp >= timeoutAt',
];

export function TestPipeline() {
  return (
    <section id="tests" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="x — proof" title="99 tests green" subtitle="reproducible · public · clone & run" />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          {/* Big totals on the left */}
          <div className="col-span-12 lg:col-span-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-8">
              <Big k="foundry tests" v="66" />
              <Big k="vitest tests" v="33" />
              <Big k="critical-path coverage" v="100%" />
              <Big k="invariants asserted" v="07" />
            </div>

            <p className="mt-10 text-[12px] leading-[1.7] text-fg-muted border-l-2 border-phosphor pl-4 max-w-[40ch]">
              Every line below is checked on every commit. The load test alone fires{' '}
              <span className="text-fg">200 real on-chain orders</span> across 100 agents and asserts the
              escrow contract holds <span className="text-phosphor">zero leaked wei</span> when the dust
              settles.
            </p>

            <pre className="mt-6 text-[11px] text-fg-dim border border-line p-4 leading-[1.7]">
              <span className="text-phosphor">$ </span>git clone agentmesh && cd agentmesh
              {'\n'}
              <span className="text-phosphor">$ </span>pnpm install
              {'\n'}
              <span className="text-phosphor">$ </span>pnpm contracts:test
              {'\n'}
              <span className="text-fg-muted">  Suite result: 66 passed, 0 failed</span>
              {'\n'}
              <span className="text-phosphor">$ </span>pnpm -r test
              {'\n'}
              <span className="text-fg-muted">  33 passed (3 packages)</span>
              {'\n'}
              <span className="text-phosphor">$ </span>pnpm demo
              {'\n'}
              <span className="text-fg-muted">  ✅ end-to-end · six layers · 6.3s</span>
            </pre>
          </div>

          {/* Test buckets */}
          <div className="col-span-12 lg:col-span-5">
            {RESULTS.map((b) => (
              <div key={b.bucket} className="mb-8">
                <div className="flex items-baseline justify-between border-b border-line pb-2 mb-3">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-fg-muted">{b.bucket}</span>
                  <span className="text-[11px] uppercase tracking-[0.22em] text-phosphor">
                    {b.total} pass
                  </span>
                </div>
                <ul className="space-y-1.5 text-[12px]">
                  {b.items.map((i) => (
                    <li key={i.name} className="flex items-baseline gap-3">
                      <span className="text-phosphor">✓</span>
                      <span className="flex-1 text-fg">{i.name}</span>
                      <span className="dot-leader inline-block flex-1 text-fg-dim h-px" />
                      <span className="text-fg-muted tabular-nums">
                        {typeof i.n === 'number' ? `${i.n} test${i.n === 1 ? '' : 's'}` : i.n}
                      </span>
                      <span className="text-amber uppercase text-[10px] tracking-[0.18em] ml-2">
                        {i.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Invariants */}
          <div className="col-span-12 lg:col-span-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-4 pb-2 border-b border-line">
              <span className="text-phosphor">▮</span> invariants
            </div>
            <ul className="space-y-3 text-[11.5px] leading-[1.6]">
              {INVARIANTS.map((inv, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-phosphor mt-0.5 tabular-nums">{(i + 1).toString().padStart(2, '0')}</span>
                  <code className="text-fg-muted font-mono">{inv}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
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
