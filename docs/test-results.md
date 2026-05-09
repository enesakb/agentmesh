# Test results

Single source of truth for what's tested and what passes. Numbers are
reproducible — clone, install, run, see the same.

## Foundry · Solidity (66 tests / 8 suites)

```
$ pnpm contracts:test
```

| Suite | Tests | Lines covered | Branches covered | Funcs covered |
|---|---|---|---|---|
| `AgentRegistry.t.sol` | 13 | 98.31% | 90.91% | 100.00% |
| `AgentAccount.t.sol` | 11 | 81.69% | 43.75% | 81.25% |
| `SpendingPolicyModule.t.sol` | 7 | 90.00% | 100.00% | 75.00% |
| `RecoveryModule.t.sol` | 7 | 86.89% | 41.18% | 71.43% |
| `ServiceMarketplace.t.sol` | 14 | **100.00%** | 55.56% | **100.00%** |
| `ReputationRegistry.t.sol` | 11 | 95.45% | 77.78% | 88.89% |
| `Integration.t.sol` | 1 | — | — | — |
| `LoadTest.t.sol` | 2 | — | — | — |
| **Total** | **66** | **77.80%** | **59.09%** | **80.00%** |

Critical-path contracts (Marketplace + Factory) hit 100% line + function
coverage. Lower branch percentages on Recovery and AgentAccount are
expected — many branches are revert paths the integration tests don't
exhaustively explore (and that's what dedicated unit tests are for).

### Notable invariant tests

`LoadTest.test_workload_200_orders` runs:

- 50 providers × 50 consumers = 100 agents
- Each provider lists once
- 200 orders placed
- 70% completed by provider, 30% timeout-refunded by consumer
- After all orders resolve, asserts:
  1. `marketplace.balance == 0` (zero escrow leak)
  2. `successCount == completedCount × 2` (both sides logged)
  3. `failureCount == refundedCount` (provider only)

The test reports gas consumption (78,510,849 gas total) so regressions
are visible in CI diffs.

## Vitest · TypeScript (33 tests / 3 packages)

```
$ pnpm -r test
```

| Package | Tests | What it covers |
|---|---|---|
| `@agentmesh/shared` | 4 | `capabilityHash` determinism + reverse lookup |
| `@agentmesh/x402-server` | 23 | header parsing, order verification, replay protection, full Express middleware via supertest |
| `@agentmesh/x402-client` | 6 | 402 retry flow, max-amount cap, expired challenge, allowed networks, missing accept option |
| **Total** | **33** | |

x402-server is the heaviest with 23 tests because it's the primary
trust boundary on hosted deploys.

## End-to-end (`pnpm demo`)

```
$ pnpm demo
```

Spawns a fresh anvil, deploys the seven contracts, starts demo-alpha + demo-beta
processes. Beta:
1. Registers as `demo-beta` with capability `consumer`
2. Discovers providers with `data.weather`
3. Picks alpha's listing, places an order through the SDK
4. Sends a paid GET to alpha, gets weather JSON back
5. Reads reputation for both sides

Average run time: **23–29 s**. Stress runner (`pnpm stress 10`) runs this
10× consecutively; in our last measurement: **10/10 OK, avg 29.02 s**.

## External-agent stress (no internal deps, hits live deploy)

```
$ pnpm --filter @agentmesh/external-agent stress:all
```

Runs against `https://agentmesh-neon.vercel.app` — the same URL anyone in
the world would use.

| Phase | Cycles | Result |
|---|---|---|
| Sequential | 20 | 20/20 OK · avg 367 ms · p95 2.83 s |
| Parallel (8 agents × 3 rounds) | 24 | 24/24 OK · 8.19 cycles/sec |
| Adversarial (10 attack vectors) | 10 | 10/10 rejected · 0 breaches |

Adversarial vectors:

| # | Attack | Status |
|---|---|---|
| 1 | no payment header | 402 ✓ |
| 2 | wrong scheme prefix | 402 ✓ |
| 3 | missing orderId | 402 ✓ |
| 4 | malformed token (3 parts instead of 6) | 402 ✓ |
| 5 | forged HMAC signature | 402 ✓ |
| 6 | expired token (past expiresAt) | 402 ✓ |
| 7 | wrong listingId in token | 402 ✓ |
| 8 | wrong priceWei in token | 402 ✓ |
| 9 | empty `X-PAYMENT` header | 402 ✓ |
| 10 | huge token (10 KB garbage) | 402 ✓ |

## Swarm (50-agent local stress)

```
$ N=50 DURATION_MS=180000 ORDER_TARGET=300 pnpm --filter @agentmesh/external-agent swarm
```

Spawns 50 owner EOAs + 50 smart accounts, registers them with paired
capabilities (25 providers × 25 consumers across 8 capability domains),
then runs a free-form trade loop until target orders settle or duration
expires.

Output is buffered through pnpm/tsx; for live progress, run with `npx tsx`
directly. Results write to `docs/swarm-results.json`.

## CI (GitHub Actions)

Runs on every push to `main` and every pull request:

| Job | Trigger | Time |
|---|---|---|
| Foundry · Solidity | push + PR | ~25 s |
| pnpm · TypeScript | push + PR | ~35 s |
| Anchor · Solana (build only) | manual (`workflow_dispatch`) | ~5 min |

Foundry runs full test + coverage. TypeScript runs typecheck + vitest +
biome lint + production build of the site. Solana is gated to manual
because the placeholder program ID makes builds fail until a keypair is
shipped.

## Reproducing locally

```bash
git clone https://github.com/enesakb/agentmesh
cd agentmesh
pnpm install

# Foundry suite (~50 ms)
pnpm contracts:test

# Vitest suite (~3 s)
pnpm -r test

# End-to-end demo (~25 s)
pnpm demo

# Stress (10 demo runs, ~5 min)
pnpm stress 10

# External-agent stress (~30 s, hits live deploy)
pnpm --filter @agentmesh/external-agent stress:all
```

If any of these fail on a fresh clone, that's a bug — open an issue with
the output.
