## Summary

<!-- 2-3 sentences: what changed and why. -->

## Problem & approach

<!-- What was broken / missing? Why this approach over alternatives? -->

## Tests

- [ ] `pnpm contracts:test` (Foundry — 66+ tests)
- [ ] `pnpm -r test` (Vitest — 33+ tests)
- [ ] `pnpm exec biome check .`
- [ ] `pnpm demo` (end-to-end on anvil)

## Layer(s) affected

<!-- Tag the AgentMesh layer(s): Identity / Wallet / Payment / Discovery /
     Marketplace / Reputation / SDK / Site / Cross-chain -->

## Breaking change?

- [ ] No
- [ ] Yes — migration plan described below

## Checklist

- [ ] New code has corresponding tests
- [ ] Public-facing changes documented in `docs/`
- [ ] If contract change: gas impact noted, invariants still hold
- [ ] If protocol change: ADR written under `docs/decisions/`
