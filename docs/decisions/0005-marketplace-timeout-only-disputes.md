# ADR-0005 — Disputes are timeout-only in v0.1

Date: 2026-05-08

## Context

Real-world trade disputes (delivery quality, partial fulfilment, off-chain
fraud) require a referee — an oracle, a Kleros-style jury, an arbiter
contract, or a centralised admin. Each of these is a multi-week project
on its own.

The MVP demo has zero need for a sophisticated dispute resolver: alpha
serves a JSON object, beta either receives it or doesn't. Adding a dispute
mechanism would inflate scope without aiding the demo.

## Options

1. Build a Kleros-style jury contract and integrate it.
2. Designate a deployer-controlled `disputeResolver` address.
3. **Timeout-only.** Provider has `ORDER_TIMEOUT = 1 hour` to call
   `completeOrder`. After that, consumer can call `refundOrder` and
   reclaim escrow. No "partial delivery" handling, no jury.

## Decision

Option 3.

## Consequences

- Pro: 0 lines of dispute logic. State machine fits in a paragraph.
- Con: misbehaving providers can force a 1h delay before consumer recovers
  funds. Acceptable for testnet MVP; for mainnet a market-determined
  timeout per listing is straightforward to add.
- Con: no recourse for "partial fulfilment" or "wrong data". Reputation
  is the only enforcement mechanism (provider failure logged on refund).
- Future: see `roadmap.md` for sketches on EAS-attestation-based disputes
  and oracle-fed quality checks.
