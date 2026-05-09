'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

// Heavy 3D scene — ssr: false keeps the SSR HTML free of three.js code.
// Hydrates client-side after first paint, no layout shift because the
// container has fixed aspect-ratio.
const Hero3D = dynamic(() => import('./Hero3D').then((m) => m.Hero3D), {
  ssr: false,
  loading: () => <div className="w-full aspect-square" />,
});

// Asymmetric editorial hero. Wordmark left with mouse-parallax. 3D agent
// constellation right column instead of a static info card.
export function Hero() {
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const el = wordmarkRef.current;
    if (!el) return;

    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    const handler = (ev: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (ev.clientX - rect.left - rect.width / 2) / rect.width;
      const y = (ev.clientY - rect.top - rect.height / 2) / rect.height;
      tx = x * 8;
      ty = y * 6;
    };
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.transform = `perspective(900px) rotateY(${cx * 0.4}deg) rotateX(${-cy * 0.4}deg) translate3d(${cx}px, ${ty * 0.3}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('mousemove', handler);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', handler);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative">
      <div className="scanbar" />
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 pt-16 lg:pt-24 pb-20 lg:pb-32 grid grid-cols-12 gap-6 relative z-10">
        {/* Marginalia */}
        <div className="col-span-12 lg:col-span-2 text-[10px] uppercase tracking-[0.22em] text-fg-muted">
          <div className="rise" style={{ animationDelay: '60ms' }}>─── manifest</div>
          <div className="mt-2 text-fg-dim leading-relaxed rise" style={{ animationDelay: '120ms' }}>
            sha256
            <br />
            7d3a · 9f12
            <br />
            cb44 · 0a8e
          </div>
        </div>

        {/* Wordmark + tagline */}
        <div className="col-span-12 lg:col-span-7 flex flex-col">
          <div className="text-[11px] uppercase tracking-[0.32em] text-amber rise" style={{ animationDelay: '0ms' }}>
            <span className="text-phosphor">▮</span> protocol stack — six layers, one mesh
          </div>

          <h1
            ref={wordmarkRef}
            className="font-display font-light text-[clamp(56px,11vw,168px)] leading-[0.86] tracking-[-0.04em] mt-5 rise will-change-transform"
            style={{
              animationDelay: '120ms',
              fontVariationSettings: '"SOFT" 30, "WONK" 1, "opsz" 144',
              transformStyle: 'preserve-3d',
              transition: mounted ? undefined : 'transform 600ms',
            }}
          >
            <span className="block text-fg">AgentMesh</span>
            <span className="block text-fg-muted text-[0.42em] mt-3 tracking-[-0.02em]">
              <span className="text-phosphor glow-phosphor">/</span> the agent economy, fully on-chain
            </span>
          </h1>

          <p
            className="mt-10 max-w-[58ch] text-[15px] leading-[1.7] text-fg-muted rise"
            style={{ animationDelay: '260ms' }}
          >
            On-chain identity, modular smart wallets, HTTP&nbsp;402 settlement, capability discovery, escrowed
            marketplace, append-only reputation — bundled into a single composable stack. Built with viem and
            Foundry. Runs on anvil today, Polygon Amoy tomorrow.
          </p>

          {/* CTA cluster */}
          <div className="mt-10 flex flex-wrap items-center gap-3 rise" style={{ animationDelay: '380ms' }}>
            <a className="btn-primary" href="https://github.com/enesakb/agentmesh">
              <span>→</span> github
              <span className="text-bg/40">/agentmesh</span>
            </a>
            <a className="btn-ghost" href="#live">
              live demo
            </a>
            <a className="btn-ghost" href="#sequence">
              read the spec
            </a>
          </div>

          {/* Layer ribbon */}
          <div
            className="mt-12 pt-6 border-t border-line text-[11px] uppercase tracking-[0.18em] text-fg-muted flex flex-wrap gap-x-5 gap-y-2 rise"
            style={{ animationDelay: '480ms' }}
          >
            <span><span className="text-phosphor">01</span> identity</span>
            <span><span className="text-phosphor">02</span> wallet</span>
            <span><span className="text-phosphor">03</span> payment</span>
            <span><span className="text-phosphor">04</span> discovery</span>
            <span><span className="text-phosphor">05</span> marketplace</span>
            <span><span className="text-phosphor">06</span> reputation</span>
          </div>
        </div>

        {/* Right column — 3D constellation */}
        <aside className="col-span-12 lg:col-span-3 relative">
          <div
            className="rise border border-line bg-bg-card/60 backdrop-blur-[1px] text-[11px] leading-[1.85] overflow-hidden"
            style={{ animationDelay: '540ms' }}
          >
            <div className="flex items-center justify-between text-fg-muted uppercase tracking-[0.18em] px-5 pt-4">
              <span>mesh://network</span>
              <span className="text-phosphor blink">●</span>
            </div>
            <div className="px-2 pt-1">
              <Hero3D />
            </div>
            <div className="px-5 pb-4 pt-2 border-t border-line text-fg-dim text-[10px] uppercase tracking-[0.18em]">
              demo // alpha→beta → 0.001Ξ → +1 rep
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
