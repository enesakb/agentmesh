# Changelog

All notable changes to AgentMesh will be documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versions follow [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Live on Polygon mainnet (chain id 137).** Seven contracts deployed at
  block 86,676,805. Addresses + tx hashes in
  [`docs/mainnet.md`](docs/mainnet.md) and
  [`deployments/polygon.json`](deployments/polygon.json).
- `polygon` added to `SupportedChain` type in `@agentmesh/shared` and to
  the `AgentMesh.create({ chain })` switch in `@agentmesh/sdk`.
- Polygon, Base, Arbitrum, Optimism mainnet chain-name mappings in
  `Deploy.s.sol`.

### Changed
- `README.md` status banner: "live on Polygon mainnet" + address table.
- `docs/integration-guide.md`: `chain: 'polygon'` is now the default
  example (was `'amoy'`).
- `apps/site/components/ChainBar.tsx`: Polygon shows as the first chain
  with a green "live" dot, others remain "soon" / "code".

### Fixed
- `.gitignore` now allows `deployments/polygon.json` so the SDK can load
  mainnet addresses without a private file.

---

## [0.1.0] — 2026-05-10

First public release. Six-layer protocol stack, end-to-end demo, multi-chain
ready, Solana port code-complete.

### Added

#### Smart contracts (Solidity 0.8.28, OpenZeppelin v5.1.0)
- `AgentRegistry` — name + capability index, `findByCapability(bytes32)` discovery
- `AgentAccount` — ERC-4337 v0.7 dual-path (EOA owner + EntryPoint), ERC-7579 modular hooks
- `AgentAccountFactory` — EIP-1167 minimal-proxy CREATE2 deterministic deploy
- `SpendingPolicyModule` — ERC-7579 hook: 24h rolling daily limit + per-tx limit + target blacklist
- `RecoveryModule` — Argent-style M-of-N guardian recovery with 48h timelock
- `ServiceMarketplace` — native-ETH escrow with `ORDER_TIMEOUT = 1 hour` consumer-side refund
- `ReputationRegistry` — append-only stats with sqrt-confidence-weighted score (0..10000)

#### TypeScript packages (viem 2.21, strict mode)
- `@agentmesh/shared` — ABIs (parseAbi human-readable), per-chain config, deployment loader
- `@agentmesh/x402-server` — Express middleware, marketplace-bound orderId verification, replay protection
- `@agentmesh/x402-client` — `fetchWithPayment(url, opts)` with `placeOrder` callback
- `@agentmesh/sdk` — high-level surface for all six layers; Solana adapter scaffold at `/solana`

#### Apps
- `apps/demo-alpha` — provider agent with Express + x402-server + auto-completion
- `apps/demo-beta` — consumer agent that discovers + pays + receives
- `apps/external-agent` — third-party integration client (sequential / parallel / adversarial / swarm stress)
- `apps/site` — marketing site, real `/api/weather/[city]` Edge Function, Three.js wireframe scene

#### Solana
- `programs/agentmesh` — Anchor program in Rust mirroring all six EVM contracts via PDAs
- Same score formula, same wire format, different settlement medium
- `packages/sdk/solana` — TypeScript adapter scaffold

#### Tests
- 66 Foundry tests across 8 suites including `LoadTest.t.sol` (200 orders × 100 agents, 0 escrow leak)
- 33 Vitest tests across `shared`, `x402-server`, `x402-client`
- External-agent stress: 20 sequential + 24 parallel + 10 adversarial cycles
- 7 on-chain invariants asserted under load

#### Infrastructure
- `pnpm` workspace + Turborepo
- Foundry project in `contracts/` with deterministic deployment script
- GitHub Actions CI: Foundry + pnpm + biome + Anchor (manual-only)
- Vercel deploy of marketing site
- Multi-chain config: Polygon Amoy, Base Sepolia, Arbitrum Sepolia, Optimism Sepolia, Sonic, Solana Devnet
- 6 Architecture Decision Records (ADRs) documenting load-bearing decisions

#### Documentation
- README with badges, comparison matrix, full architecture diagram
- `docs/protocol-spec.md` — wire-format reference
- `docs/architecture.md` — system + sequence diagrams
- `docs/research-notes.md` — Phase 0 standards research
- `docs/decisions/` — six ADRs
- `docs/roadmap.md` — v0.1 → v1.0 path
- `DEPLOYING.md`, `FAUCETS.md`, `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE`
- Issue + PR templates

### Known limitations

- **Unaudited**: do not deploy to mainnet without independent review
- Hosted demo's signed orderId is replayable within its 60s TTL (in-memory deduplication
  not viable across Vercel Edge isolates without shared store)
- `apps/external-agent/swarm.ts` produces buffered output via pnpm; run with `npx tsx` directly
  for live progress
- Anchor program ID is a placeholder — regenerate on first `anchor build`
- Solana SDK adapter is scaffold only; methods throw `[NOT_IMPLEMENTED]` until IDL is generated
