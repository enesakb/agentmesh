// Full-bleed editorial chapter break. Use sparingly.
export function PullQuote({
  children,
  attribution,
}: {
  children: React.ReactNode;
  attribution?: string;
}) {
  return (
    <section className="relative py-20 lg:py-28 border-y border-line bg-bg-elevated">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10 relative">
        <span
          className="absolute -top-2 -left-2 lg:-top-4 lg:-left-6 font-display text-[140px] lg:text-[200px] leading-[0.7] text-phosphor opacity-40 pointer-events-none"
          style={{ fontVariationSettings: '"SOFT" 80, "WONK" 1, "opsz" 144' }}
          aria-hidden
        >
          “
        </span>

        <blockquote
          className="font-display font-light text-[40px] md:text-[64px] lg:text-[88px] leading-[0.98] tracking-[-0.03em] text-fg relative z-10"
          style={{ fontVariationSettings: '"SOFT" 60, "WONK" 1, "opsz" 144' }}
        >
          {children}
        </blockquote>

        {attribution && (
          <div className="mt-8 text-[11px] uppercase tracking-[0.22em] text-fg-muted">
            ─── <span className="text-phosphor">▮</span> {attribution}
          </div>
        )}
      </div>
    </section>
  );
}
