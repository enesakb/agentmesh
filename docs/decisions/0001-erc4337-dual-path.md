# ADR-0001 — Dual execution path for `AgentAccount`

Date: 2026-05-08

## Context

ERC-4337 v0.7 is the canonical account-abstraction standard, but the full
flow (UserOp → bundler → EntryPoint → account) requires a running bundler
infrastructure (Pimlico) and is **incompatible with anvil** (no public
bundler endpoints listen on local chains).

The MVP demo is local-first (anvil). It must be reproducible without
testnet funds or external services.

## Options

1. **Strict ERC-4337**. Account is callable only via EntryPoint. Demo runs
   on Polygon Amoy with Pimlico. Requires user to fund a deployer key + a
   paymaster deposit.
2. **EOA-only**. Drop ERC-4337 entirely. Owner EOA calls account directly.
   Simple, but loses interop with the bundler ecosystem.
3. **Dual path**. Owner EOA OR EntryPoint may call `execute`. The account
   implements `validateUserOp` so bundlers work, *and* the demo can run
   locally without one.

## Decision

Option 3 (dual path).

## Consequences

- Demo runs on anvil with zero external dependencies.
- Production deployments retain compatibility with Pimlico / any 4337
  bundler. The same contract supports both.
- Slight expansion of the trusted set: owner EOA is a first-class signer.
  Mitigation: the spending-policy hook still applies on `execute`, so an
  EOA-triggered call is gated identically to a UserOp-triggered call.
