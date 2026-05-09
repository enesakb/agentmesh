'use client';

/**
 * Reveal — wrapper that fades + slides + scales its children when scrolled into
 * view. Uses IntersectionObserver, no scroll listener. Each child stagger
 * reveals after the previous; `delay` shifts the entry, `from` controls the
 * direction.
 */
import { useEffect, useRef, useState } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'scale' | 'none';

const TRANSLATIONS: Record<Direction, string> = {
  up: 'translate3d(0, 32px, 0) scale(0.985)',
  down: 'translate3d(0, -32px, 0) scale(0.985)',
  left: 'translate3d(40px, 0, 0)',
  right: 'translate3d(-40px, 0, 0)',
  scale: 'scale(0.94)',
  none: 'none',
};

export function Reveal({
  children,
  from = 'up',
  delay = 0,
  threshold = 0.12,
  duration = 800,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  from?: Direction;
  delay?: number;
  threshold?: number;
  duration?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.unobserve(el);
          }
        }
      },
      // Pre-trigger 240px before the element enters the viewport so the user
      // never catches it mid-fade. Threshold 0.05 keeps it very responsive.
      { threshold: 0.05, rootMargin: '0px 0px 240px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : TRANSLATIONS[from],
    transition: `opacity ${duration}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms`,
    willChange: 'opacity, transform',
  };

  // @ts-expect-error — generic Tag attaches ref differently per element
  return <Tag ref={ref} className={className} style={style}>{children}</Tag>;
}
