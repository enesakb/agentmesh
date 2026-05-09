// Footer is a metadata block — colophon energy.
export function Footer() {
  return (
    <footer className="relative border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-16 grid grid-cols-12 gap-8 text-[12px]">
        <div className="col-span-12 lg:col-span-5">
          <div
            className="font-display text-[64px] leading-[0.85] tracking-[-0.04em] text-fg"
            style={{ fontVariationSettings: '"SOFT" 30, "WONK" 1, "opsz" 144' }}
          >
            AgentMesh
          </div>
          <p className="mt-4 text-fg-muted max-w-[44ch] leading-[1.7]">
            Six-layer protocol stack for the autonomous agent economy. MIT. Not audited. Don&apos;t ship to
            mainnet without one.
          </p>
        </div>

        <div className="col-span-6 lg:col-span-2">
          <FooterCol title="repo">
            <FooterLink href="https://github.com/enesakb/agentmesh">github</FooterLink>
            <FooterLink href="https://github.com/enesakb/agentmesh/blob/main/README.md">readme</FooterLink>
            <FooterLink href="https://github.com/enesakb/agentmesh/releases">releases</FooterLink>
          </FooterCol>
        </div>

        <div className="col-span-6 lg:col-span-2">
          <FooterCol title="docs">
            <FooterLink href="/docs/protocol-spec.md">protocol spec</FooterLink>
            <FooterLink href="/docs/architecture.md">architecture</FooterLink>
            <FooterLink href="/docs/decisions/">adrs · 6</FooterLink>
            <FooterLink href="/docs/roadmap.md">roadmap</FooterLink>
          </FooterCol>
        </div>

        <div className="col-span-12 lg:col-span-3">
          <FooterCol title="colophon">
            <li className="text-fg-muted">
              type <span className="dot-leader text-fg-dim inline-block w-3 mx-1 align-middle h-px" />{' '}
              <span className="text-fg">fraunces</span> + <span className="text-fg">jetbrains mono</span>
            </li>
            <li className="text-fg-muted">
              stack <span className="dot-leader text-fg-dim inline-block w-3 mx-1 align-middle h-px" />{' '}
              <span className="text-fg">next 16 · tailwind 4</span>
            </li>
            <li className="text-fg-muted">
              built <span className="dot-leader text-fg-dim inline-block w-3 mx-1 align-middle h-px" />{' '}
              <span className="text-fg">2026 · enes</span>
            </li>
          </FooterCol>
        </div>
      </div>

      {/* Wide colophon line */}
      <div className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-5 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-fg-dim">
          <div>
            agentmesh / v0.1 / mvp <span className="mx-3">·</span> not audited <span className="mx-3">·</span> mit
          </div>
          <div className="flex items-center gap-3">
            <span className="text-phosphor">●</span> green <span className="text-fg-muted">·</span>{' '}
            <span>chain 31337</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-fg-muted mb-3 pb-2 border-b border-line">
        {title}
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a className="text-fg hover:text-phosphor transition-colors" href={href}>
        {children}
      </a>
    </li>
  );
}
