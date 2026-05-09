# ADR-0004 — Reputation score formula

Date: 2026-05-08

## Context

Need a single 0..10000 score that:
- Is monotonic in successful tx count.
- Penalises failures.
- Doesn't let an agent "look good" after one lucky tx.
- Saturates: a long history of perfect deliveries should reach the ceiling.

## Options

1. Pure success ratio (`success / total * 10000`). Sybil-friendly: 1 success
   = 10000.
2. Linear in tx count, capped at N (e.g. `min(success * 100, 10000)`). No
   failure weighting.
3. **Confidence-weighted success rate**:

```
successRate = success * 10_000 / total          # 0..10_000
confidence  = sqrt(min(total, 100))              # 1..10
score       = (successRate * confidence) / 10
```

## Decision

Option 3.

## Consequences

- 1 success → score 1000 (10% of ceiling).
- 100 successes (no failure) → score 10000.
- 100 txs at 90% success → score 9000.
- The `sqrt(min(N,100))` term grows quickly at first then plateaus, which
  matches a humans-friendly intuition: trust grows fast on a few interactions
  and slowly thereafter.
- Sybils can't bootstrap reputation cheaply: each tx costs gas + escrow + a
  counterparty's tx.
- Future work: weight by `valueWei`, `uniqueCounterpartiesCount`, or apply
  exponential decay on stale history. None of these are necessary for the
  v0.1 demo.
