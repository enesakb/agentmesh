# Contributing to AgentMesh

Thanks for considering a contribution. AgentMesh is a public-good protocol;
the bar for change is **clarity over cleverness** and **invariant safety
over feature velocity**.

## What we welcome

- Bug fixes (especially anything found by audit / fuzzing)
- Test coverage for previously untested branches
- Documentation: clearer ADRs, better diagrams, more concrete code examples
- Cross-chain implementations (Solana port is scaffolded; Move / Sui /
  Aptos / Stellar would all fit)
- Real integrators: anything that demonstrates an actual third-party agent
  using the protocol
- Performance: gas optimisations, SDK call batching, RPC efficiency

## What we don't merge yet (without discussion)

- New layers in the protocol (the six are a deliberate constraint)
- Alternative payment schemes that bypass the marketplace
- Hard forks of `AgentRegistry` / `ServiceMarketplace` interfaces — instead,
  propose a v2 contract and migration path
- Changes that increase contract size meaningfully without commensurate
  feature gain (we want minimal contracts on mainnet)

## Development setup

```bash
git clone https://github.com/enesakb/agentmesh
cd agentmesh
pnpm install
pnpm contracts:test       # 66 Foundry tests
pnpm -r test              # 33 Vitest tests
pnpm demo                 # full local end-to-end
```

If you have anvil running on `127.0.0.1:8545`, the demo orchestrator skips
restarting it. Otherwise it boots a fresh instance.

## Code style

- Solidity: Solidity 0.8.28+, OZ v5 patterns, errors over `require` strings,
  `unchecked` blocks only with adjacent comment justifying safety.
- TypeScript: viem over ethers, strict mode, biome formatter.
- Comments: explain *why* and the *invariant*, not *what*. Treat reader as
  smart but unfamiliar.
- Tests: every public function gets a happy path + at least one revert path.
  Invariants get explicit `assert` statements with a message.

## Branch / PR flow

1. Fork → feature branch (e.g. `feat/sonic-deploy`, `fix/refund-edge-case`)
2. Run `pnpm contracts:test`, `pnpm -r test`, `pnpm exec biome check .`
3. Open PR against `main`. Describe:
   - Problem you're solving
   - Approach + rationale
   - Tests added or changed
4. CI must pass. Merge is squash-only.

## Issue templates

- **Bug**: include reproducer (`pnpm demo` log or specific test case),
  expected vs actual, environment (chain, version)
- **Security**: ⚠ DO NOT FILE PUBLIC. Email the maintainer or open a private
  advisory. We'll set up a bug bounty program for v1.0.
- **Discussion**: anything bigger — architecture, protocol changes, new chain
  support, etc.

## Code of conduct

Be direct. No hostility. Disagreement is fine; personal attacks aren't.
The protocol is the artifact, not the participants.

## Licence

MIT. By contributing, you agree your changes are released under MIT.
