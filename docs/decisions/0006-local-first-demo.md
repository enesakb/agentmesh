# ADR-0006 — Local-first demo, testnet as opt-in

Date: 2026-05-08

## Context

The brief asked for an end-to-end demo on Polygon Amoy. But Amoy
deployment requires:
- A funded testnet deployer (MATIC from a faucet).
- An online RPC, latencies of a few seconds per tx.
- Pimlico bundler for the ERC-4337 path.

That makes the demo non-deterministic and dependent on external state
(faucet rate-limits, Amoy reorg behaviour).

## Options

1. **Amoy-only demo.** Brief specifies Amoy, follow it.
2. **Anvil-only.** Skip testnet entirely.
3. **Local-first, Amoy as opt-in.** Demo runs on anvil out of the box;
   `scripts/deploy-amoy.ps1` is provided for the testnet target.

## Decision

Option 3.

## Consequences

- `pnpm demo` works in seconds on a clean machine — no external
  dependencies beyond pnpm and Foundry.
- The same contracts and scripts deploy to Amoy with one command. The
  brief's testnet target is not abandoned, just opt-in.
- Owner EOAs use anvil's pre-funded keys (the standard Foundry mnemonic).
  These are publicly known and **must not** be reused on mainnet.
- The dual ERC-4337 path (ADR-0001) is what makes this possible: anvil
  doesn't run a bundler, but our account doesn't need one.
