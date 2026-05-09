// Editorial numerals — large, Fraunces, with monospace labels underneath.
// Each stat is annotated like a museum plaque.
const stats = [
  { num: '64', label: 'foundry tests', sub: 'unit + integration · all green' },
  { num: '33', label: 'vitest tests', sub: 'shared / x402 / sdk' },
  { num: '100%', label: 'critical-path coverage', sub: 'marketplace + factory' },
  { num: '06', label: 'adrs shipped', sub: 'every load-bearing decision' },
];

export function StatsStrip() {
  return (
    <section className="relative border-y border-line bg-bg-elevated">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 grid grid-cols-2 lg:grid-cols-4 gap-y-10">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`relative py-10 px-4 lg:px-8 ${
              i !== 0 ? 'lg:border-l border-line' : ''
            } ${i % 2 !== 0 ? 'border-l border-line lg:border-l' : ''}`}
          >
            <div className="text-[11px] uppercase tracking-[0.22em] text-fg-muted mb-3">
              <span className="text-phosphor">▮</span> 0{i + 1}
            </div>
            <div
              className="font-display font-light text-[80px] lg:text-[112px] leading-[0.85] tracking-[-0.04em] text-fg"
              style={{ fontVariationSettings: '"SOFT" 50, "WONK" 1, "opsz" 144' }}
            >
              {s.num}
            </div>
            <div className="mt-4 uppercase text-[11px] tracking-[0.2em] text-fg">{s.label}</div>
            <div className="mt-1 text-[12px] text-fg-muted">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
