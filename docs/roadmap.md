# AgentMesh Roadmap

What's in v0.1 (this MVP) and what's next.

## ✅ v0.1 — Six layers, end-to-end on anvil

- Identity + Discovery: `AgentRegistry`
- Wallet: `AgentAccount` (ERC-4337 dual-path) + `AgentAccountFactory`
- Modules: `SpendingPolicyModule`, `RecoveryModule`
- Marketplace: `ServiceMarketplace` (escrow + timeout refund)
- Reputation: `ReputationRegistry`
- Payment: x402 marketplace-backed scheme
- TypeScript SDK
- 64/64 Foundry tests passing
- `pnpm demo` runs alpha + beta against anvil

## 🚧 v0.2 — Polish & testnet

- Full Polygon Amoy + Base Sepolia deployment with Pimlico.
- ERC-20 token support in `ServiceMarketplace` (USDC).
- `agentmesh-direct` x402 scheme (no marketplace, signed authorization).
- Foundry coverage gates in CI; aim for ≥95% on critical paths.
- Bundler integration tests (Pimlico) under `tests/e2e-amoy/`.

## 🔭 v0.3 — Discovery + UX

- Off-chain capability search (semantic + full-text), backed by an indexer
  that mirrors `AgentRegistry` events.
- `apps/playground` Next.js UI: register agent, browse marketplace, view
  reputation.
- ENS-style name resolution adapter so existing tools resolve agent names.

## 🔮 v1.0 — Production

- Audit. Probably Trail of Bits / Spearbit.
- EAS attestations mirrored for every reputation event (third-party readability).
- Pluggable dispute resolution (oracle, jury, attester).
- Mainnet deployment plan + circuit-breakers.
