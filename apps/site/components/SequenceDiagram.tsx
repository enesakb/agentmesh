import { SectionHeading } from './Layers';

const diagram = String.raw`
   beta agent              registry           marketplace          alpha agent + http
       │                        │                  │                        │
       │ 01  findByCapability(data.weather)                                 │
       │ ─────────────────────▶ │                  │                        │
       │ ◀── [α]  α=0xba6e..bc0A ◯                 │                        │
       │                                                                    │
       │ 02  GET  /weather/Berlin   (no X-PAYMENT)                          │
       │ ─────────────────────────────────────────────────────────────────▶ │
       │ ◀──── 402  accepts:[{ scheme: 'agentmesh-marketplace', amount, listingId }]
       │                                                                    │
       │ 03  placeOrder(listingId)  { value: 0.001 Ξ }                      │
       │ ─────────────────────────▶│   escrow held ✦   orderId = 04         │
       │                                                                    │
       │ 04  GET  /weather/Berlin                                           │
       │     X-PAYMENT: agentmesh-marketplace;orderId=04                    │
       │ ─────────────────────────────────────────────────────────────────▶ │
       │                                          provider verifies on-chain
       │                                          (status, listingId, price)
       │ ◀──── 200  { city: 'Berlin', tempC: 20.0 }                         │
       │                                                                    │
       │                                          completeOrder(04, proof)  │
       │                                          ─────────────────────▶◯   │
       │                                                                    │
       │ 05  ReputationRegistry.logSuccess(α, β) ; logSuccess(β, α)         │
       │ ───────────────────────────────────────────────────────────────────│
       │     score → 2000 (sqrt(N=4)·rate / 10)                             │
       ▼                                                                    ▼
`;

export function SequenceDiagramSection() {
  return (
    <section id="sequence" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="iv — wire format" title="sequence" subtitle="alpha · beta · chain" />

        <div className="mt-12 lg:mt-16 grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-9 relative border border-line bg-bg-card/60 overflow-hidden">
            <div className="absolute top-3 right-3 text-[10px] uppercase tracking-[0.22em] text-fg-dim">
              <span className="text-phosphor">▮</span> protocol.seq
            </div>
            <pre className="seq p-6 lg:p-10 text-fg-muted overflow-x-auto">{diagram}</pre>
          </div>

          <aside className="col-span-12 lg:col-span-3 text-[12px] leading-[1.7] text-fg-muted space-y-5">
            <Note label="01–02 discovery + 402">
              The provider is found by capability hash, not name. Beta sees a 402 with a marketplace-shaped
              accept option.
            </Note>
            <Note label="03 escrow">
              <span className="text-fg">placeOrder()</span> locks 0.001 Ξ in{' '}
              <span className="text-fg">ServiceMarketplace</span>. Provider can only release it on completion
              — or consumer refunds after the timeout.
            </Note>
            <Note label="04 settlement">
              The retried request carries <span className="text-amber">X-PAYMENT</span>. Provider verifies the
              order on-chain — wrong provider, wrong listing, or wrong price all reject with 402.
            </Note>
            <Note label="05 reputation">
              Both sides accrue a success record automatically. The score is{' '}
              <span className="text-fg">(successRate · √min(N,100)) / 10</span>.
            </Note>
          </aside>
        </div>
      </div>
    </section>
  );
}

function Note({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-l border-line-bright pl-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-phosphor mb-1">{label}</div>
      <p>{children}</p>
    </div>
  );
}
