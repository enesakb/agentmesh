'use client';

/**
 * Tilt — wrap an element to give it a 3D mouse-tracked tilt. Pure CSS perspective
 * transform driven by pointer rect-relative position. Lerps with rAF for buttery
 * follow-through. Pointer-leave returns to neutral.
 */
import { useEffect, useRef } from 'react';

export function Tilt({
  children,
  intensity = 7,
  className,
}: {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let active = false;

    const onMove = (ev: PointerEvent) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      tx = (px - 0.5) * intensity;
      ty = (py - 0.5) * intensity;
      active = true;
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      active = false;
    };
    const tick = () => {
      const k = active ? 0.14 : 0.08;
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      el.style.transform = `perspective(1100px) rotateY(${cx}deg) rotateX(${-cy}deg)`;
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return (
    <div ref={ref} className={className} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
      {children}
    </div>
  );
}
