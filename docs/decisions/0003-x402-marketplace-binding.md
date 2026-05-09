# ADR-0003 — Bind x402 settlement to `ServiceMarketplace` orders

Date: 2026-05-08

## Context

Coinbase's x402 reference uses signed EIP-3009 USDC transfers as payment
proofs. That's elegant for raw HTTP, but doesn't compose with our other
layers — there's no escrow, no cross-trade reputation hook, no refund path.

Our ecosystem has a `ServiceMarketplace`. Reusing it for x402 settlement
gives us *for free*:
- Escrow until delivery.
- Refund on no-show.
- Reputation logging on completion.
- Audit trail (`OrderCompleted` events).

## Options

1. EIP-3009 USDC signed-transfer scheme (Coinbase reference).
2. Direct native-ETH transfer with tx-hash proof.
3. **Marketplace-backed orders.** `X-PAYMENT` carries an `orderId` from
   `ServiceMarketplace.placeOrder`.

## Decision

Option 3 for v0.1.

## Consequences

- Pro: deeply composable with the rest of the stack. Reputation flows
  naturally.
- Pro: the consumer always has refund recourse after `ORDER_TIMEOUT`.
- Con: requires two on-chain txs per resource access (placeOrder +
  completeOrder). USDC signed-transfer needs only one (the EIP-3009
  signature). Acceptable for MVP because:
  - Cost is bounded by a cheap testnet.
  - ETH-native MVP doesn't need EIP-3009 anyway.
- Future: add a parallel `agentmesh-direct` scheme (Option 2) for
  micropayments where escrow overhead is too high.
