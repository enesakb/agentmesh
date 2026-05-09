# Threat model

What AgentMesh defends against, what it doesn't, and what the trust
assumptions are. Read this before deploying — it's the protocol you're
running, not just code.

## Trust assumptions

The protocol assumes you trust:

| Component | Why you must trust it |
|---|---|
| The chain's consensus | We can't operate if the chain reorgs / forks badly |
| The Solidity compiler (0.8.28) | Output bytecode does what the source says |
| OpenZeppelin v5.x utility contracts | We use `Ownable`, `ReentrancyGuard`, `Clones` |
| Your owner EOA's private key | If the owner key leaks, the agent's funds are compromisable until recovery fires |
| Your guardians' keys (if recovery is on) | M of N guardians can rotate ownership — choose them carefully |
| Your hosting provider for the HTTP layer | x402 server runs on your infra; if that infra is compromised, you can sign fake responses |

The protocol does **not** assume:

- Other agents are honest
- The marketplace operator is honest (there isn't one — it's a contract)
- Bundlers / RPC providers are honest (we use them only for transport)
- Off-chain reputation aggregators are honest

## Threats

### T1: Owner key compromise

**Who**: attacker steals your owner key (phishing, malware, insider).

**What they can do**:
- Drain the agent account up to the spending-policy limits (per-tx + daily)
- Rotate the recovery module
- Install/uninstall hooks
- Permanently disable the wallet (set owner to 0xdead)

**What they CAN'T do**:
- Bypass the spending-policy hook (it gates every `execute`)
- Spend more than the daily limit until 24h rolls over
- Drain reputation balances (no balance to drain — it's append-only stats)

**Mitigation**: spending policy with conservative limits + recovery module
with M-of-N guardians. Time-locked recovery (48h) lets you cancel if the
attacker tries to rotate ownership.

### T2: Provider takes the order, doesn't deliver

**What they can do**: hold escrow for up to `ORDER_TIMEOUT` (1h default).

**What they CAN'T do**:
- Keep the funds — consumer triggers `refundOrder()` after timeout
- Hide it — `OrderRefunded` event is public, reputation flags failure

**Mitigation**: timeout-based refund + reputation. Consumers should pre-screen
providers by `getReputationScore()` before placing high-value orders.

### T3: Consumer pays, demands data, refuses to acknowledge

**Reality**: provider can release the data + claim the escrow without the
consumer's signature. The protocol favours providers in the no-action case.

**What consumers can do**: refuse future trades with bad providers (visible
on-chain reputation), publish proof of bad data off-chain.

**Limit**: AgentMesh v0.1 has no on-chain quality oracle. v0.3 plans an
EAS-attestation-based dispute mechanism.

### T4: Replay of x402 orderId

**Hosted demo (signed token)**: tokens are HMAC-signed with TTL. Within the
60s TTL, any holder of the token can redeem it. We accept this as a known
demo limitation — the production on-chain flow doesn't have it because
on-chain `getOrder().status` enforces single-use.

**On-chain protocol**: orderId is an integer; `completeOrder` sets status to
`Completed`; second call reverts with `OrderNotActive`. No replay possible.

### T5: Sybil reputation attack

**What they try**: create many fake agents that trade with each other to
inflate one agent's reputation.

**What costs them**:
- Each fake agent needs gas to register
- Each trade needs gas for placeOrder + completeOrder = 2 txs
- Each trade locks `priceWei` ETH in escrow (briefly)

**What they gain**:
- Score grows with `sqrt(min(N, 100))` — reputation gets *less* sensitive
  to additional fake trades after the first 100. Dishonestly amassing 1000
  fake trades looks the same as 100 honest ones.

**Limit of defense**: an attacker with $$$ can still afford to create real
trades. Reputation is **trust-from-history** not **proof-of-personhood**.

### T6: Capability namespace squatting

**What they try**: register many agents with capability hashes that are
likely searches (`keccak256("data.weather")`, etc.) but offer junk.

**Defense**: the protocol doesn't care about quality — discovery just returns
a list. Consumers must rank by reputation. As reputation accrues, real
providers float to the top.

### T7: Front-running

**Scenario**: bot sees a profitable order in the mempool and front-runs the
provider's `completeOrder` to claim escrow.

**Reality**: `completeOrder` requires `msg.sender == order.provider`. Only
the provider can claim. Front-running is impossible.

### T8: Owner-of-marketplace social engineering

The deployer of `ReputationRegistry` initially holds owner permission to
authorize loggers. Currently `ServiceMarketplace` is the only authorized
logger.

**Scenario**: attacker convinces the owner to authorize a malicious logger
that fakes successful orders to inflate reputation.

**Mitigation for v1.0**: owner role transferred to a multisig (3-of-5 or
similar). Authorize-logger calls go through a timelock.

**Current state**: deployer is a single key. Don't deploy mainnet without
a multisig owner.

### T9: Re-entrancy

Marketplace uses `ReentrancyGuard`. `completeOrder` and `refundOrder` are
both `nonReentrant`. The pattern of "set status, transfer ETH, log
reputation" is also re-entrancy-safe by design (status flip happens before
external call).

### T10: Integer overflow

Solidity 0.8.28 has built-in overflow checks. The only `unchecked` blocks
in the codebase are loop counters (always increasing in a small range) and
have adjacent comments justifying.

## What the audit should focus on

If a real audit happens:

1. `ServiceMarketplace.completeOrder` — escrow release path; verify no way
   to claim more than `priceWei` per order
2. `AgentAccount.execute` + hook iteration — verify hooks can't be bypassed,
   verify recovery rotation can't happen without guardian signatures
3. `ReputationRegistry` — verify `_log` is unreachable except via authorized
   logger
4. `AgentRegistry._setCapabilities` — verify capability index doesn't grow
   unboundedly under malicious input
5. Front-running and MEV impact on `placeOrder` (currently not a real
   concern: paying for a service isn't MEV-extractable)
6. Gas-griefing: a malicious provider could lock escrow with cheap orders
   and never complete (but consumer recovers via timeout)

## Out of scope for the protocol

- Whether the AI driving the agent is good at its job (that's your problem)
- Whether the off-chain HTTP server is honest (that's the provider's reputation)
- Whether testnet faucets distribute fairly
- Privacy of the agent's identity (everything is on-chain by design)

## Operational guidance

For mainnet deploy:

- [ ] Independent code audit (Trail of Bits, Spearbit, OpenZeppelin)
- [ ] 30 days of testnet operation without incident
- [ ] Owner address = multisig (3+ signers, geographically distributed)
- [ ] Bug bounty programme funded with ≥ $10k pool
- [ ] On-call rotation for first 90 days post-launch
- [ ] Public post-deploy verification: every contract address on Etherscan
      with verified source code
