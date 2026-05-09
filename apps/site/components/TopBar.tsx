import { BlockTicker } from './BlockTicker';

export function TopBar() {
  return (
    <header className="relative z-20 border-b border-line/80 backdrop-blur-[2px] bg-bg/60 sticky top-0">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 py-4 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-fg-muted">
        <div className="flex items-center gap-6">
          <span className="text-fg">
            <span className="text-phosphor">▮</span> agentmesh.protocol
          </span>
          <span className="hidden md:inline">v0.1 / mvp</span>
        </div>

        <nav className="hidden lg:flex items-center gap-5">
          <a href="#how" className="hover:text-phosphor transition-colors">
            how
          </a>
          <a href="#layers" className="hover:text-phosphor transition-colors">
            layers
          </a>
          <a href="#sdk" className="hover:text-phosphor transition-colors">
            sdk
          </a>
          <a href="#try" className="hover:text-phosphor transition-colors">
            try it
          </a>
          <a href="#tests" className="hover:text-phosphor transition-colors">
            99·tests
          </a>
          <a href="#manifesto" className="hover:text-phosphor transition-colors">
            manifest
          </a>
          <a href="#compare" className="hover:text-phosphor transition-colors">
            vs.
          </a>
          <a href="#faq" className="hover:text-phosphor transition-colors">
            faq
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden md:inline">
            <span className="text-phosphor blink">●</span> 64/64 green
          </span>
          <span className="hidden lg:inline">
            <BlockTicker />
          </span>
        </div>
      </div>
    </header>
  );
}
