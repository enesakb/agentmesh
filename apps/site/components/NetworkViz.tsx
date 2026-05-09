'use client';

// Tiny animated network graph — replaces the static session-info card in the
// hero. SVG nodes connected by phosphor edges that pulse out from a center.
// Pure CSS animation, no JS draw loop.
import { useMemo } from 'react';

const NODES = 9;

export function NetworkViz() {
  const nodes = useMemo(() => {
    // Deterministic pseudo-random positions seeded by index — same on every load.
    const out: { x: number; y: number; r: number; delay: number }[] = [];
    for (let i = 0; i < NODES; i++) {
      const a = (i / NODES) * Math.PI * 2 + 0.4;
      const radius = 38 + ((i * 17) % 22);
      out.push({
        x: 100 + Math.cos(a) * radius,
        y: 100 + Math.sin(a) * radius,
        r: i === 0 ? 5 : 2 + ((i * 3) % 3),
        delay: (i * 0.35) % 3,
      });
    }
    return out;
  }, []);

  const center = { x: 100, y: 100 };

  return (
    <svg viewBox="0 0 200 200" className="w-full h-auto" role="img" aria-label="agent network">
      <defs>
        <radialGradient id="ng-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#b8ff3a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#b8ff3a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={center.x} cy={center.y} r="48" fill="url(#ng-glow)" />

      {/* edges */}
      {nodes.map((n, i) =>
        i === 0 ? null : (
          <line
            key={`e-${i}`}
            x1={center.x}
            y1={center.y}
            x2={n.x}
            y2={n.y}
            stroke="#688f1c"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            opacity="0.7"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-30"
              dur={`${4 + (i % 3)}s`}
              repeatCount="indefinite"
              begin={`${n.delay}s`}
            />
          </line>
        ),
      )}

      {/* nodes */}
      {nodes.map((n, i) => (
        <g key={`n-${i}`}>
          {i === 0 && (
            <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke="#b8ff3a" strokeWidth="0.6" opacity="0.6">
              <animate attributeName="r" from={n.r + 5} to={n.r + 14} dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="2.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={i === 0 ? '#b8ff3a' : '#ecece6'}
            opacity={i === 0 ? 1 : 0.85}
          />
        </g>
      ))}
    </svg>
  );
}
