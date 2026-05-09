import { SectionHeading } from './Layers';

// Cell states: full / partial / none
const FULL = 'full';
const PART = 'partial';
const NONE = 'none';

type Cell = typeof FULL | typeof PART | typeof NONE;

const COLS = ['AgentMesh', 'x402', 'ai16z', 'Virtuals', 'Olas', 'Pimlico'] as const;

const ROWS: { layer: string; cells: Record<(typeof COLS)[number], Cell> }[] = [
  {
    layer: 'identity',
    cells: { AgentMesh: FULL, x402: NONE, ai16z: PART, Virtuals: FULL, Olas: PART, Pimlico: NONE },
  },
  {
    layer: 'wallet  (erc-4337 / 7579)',
    cells: { AgentMesh: FULL, x402: NONE, ai16z: PART, Virtuals: PART, Olas: FULL, Pimlico: FULL },
  },
  {
    layer: 'payment  (http 402)',
    cells: { AgentMesh: FULL, x402: FULL, ai16z: NONE, Virtuals: NONE, Olas: NONE, Pimlico: NONE },
  },
  {
    layer: 'discovery  (capability index)',
    cells: { AgentMesh: FULL, x402: NONE, ai16z: NONE, Virtuals: PART, Olas: PART, Pimlico: NONE },
  },
  {
    layer: 'marketplace  (escrow)',
    cells: { AgentMesh: FULL, x402: NONE, ai16z: NONE, Virtuals: NONE, Olas: PART, Pimlico: NONE },
  },
  {
    layer: 'reputation  (on-chain)',
    cells: { AgentMesh: FULL, x402: NONE, ai16z: NONE, Virtuals: PART, Olas: NONE, Pimlico: NONE },
  },
  {
    layer: 'all six in one stack',
    cells: { AgentMesh: FULL, x402: NONE, ai16z: NONE, Virtuals: NONE, Olas: NONE, Pimlico: NONE },
  },
];

export function Comparison() {
  return (
    <section id="compare" className="relative py-24 lg:py-32 border-t border-line bg-bg">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <SectionHeading kicker="viii — landscape" title="vs the rest" subtitle="six islands · one bridge" />

        <p className="mt-8 max-w-[64ch] text-[14px] leading-[1.7] text-fg-muted">
          Each project below solves one or two layers brilliantly. None solves all six. AgentMesh sits at the
          intersection — not better at any single layer than the specialist, but the only one with the whole
          loop closed in a single, composable stack.
        </p>

        <div className="mt-12 lg:mt-16 border border-line overflow-x-auto">
          <table className="w-full text-[13px] min-w-[760px]">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-4 lg:p-5 font-normal uppercase tracking-[0.18em] text-fg-muted text-[10px]">
                  layer
                </th>
                {COLS.map((c) => (
                  <th
                    key={c}
                    className={`text-center p-4 lg:p-5 font-normal uppercase tracking-[0.18em] text-[10px] ${
                      c === 'AgentMesh' ? 'text-phosphor' : 'text-fg-muted'
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.layer}
                  className={`border-b border-line ${i === ROWS.length - 1 ? 'bg-bg-card/30' : ''}`}
                >
                  <td className="p-4 lg:p-5">
                    <span className="text-fg-muted text-[10px] mr-2">
                      {(i + 1).toString().padStart(2, '0')}
                    </span>
                    <span className={i === ROWS.length - 1 ? 'text-amber' : 'text-fg'}>{row.layer}</span>
                  </td>
                  {COLS.map((c) => (
                    <td
                      key={c}
                      className={`text-center p-4 lg:p-5 ${
                        c === 'AgentMesh' ? 'bg-phosphor/[0.04] border-x border-phosphor/20' : ''
                      }`}
                    >
                      <CellMark state={row.cells[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-fg-muted">
          <Legend mark={<CellMark state={FULL} />} label="full" />
          <Legend mark={<CellMark state={PART} />} label="partial" />
          <Legend mark={<CellMark state={NONE} />} label="absent" />
          <span className="ml-auto text-fg-dim text-[10px]">
            assessment based on public docs as of 2026.05
          </span>
        </div>
      </div>
    </section>
  );
}

function CellMark({ state }: { state: Cell }) {
  if (state === FULL) return <span className="text-phosphor text-lg leading-none">●</span>;
  if (state === PART) return <span className="text-amber text-lg leading-none">◐</span>;
  return <span className="text-fg-dim text-lg leading-none">○</span>;
}

function Legend({ mark, label }: { mark: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      {mark} <span>{label}</span>
    </span>
  );
}
