# AgentMesh — Solana implementation

The same six-layer protocol, written as a single Anchor program. PDA-rooted
state structs replace the EVM contracts; semantics, score formula, and wire
format match 1:1.

## Mapping

| EVM contract | Solana PDA seed |
|---|---|
| `AgentRegistry` | `[b"agent", authority]` |
| `AgentAccount` | the authority's wallet — Solana already has native account abstraction |
| `ServiceMarketplace` listing | `[b"listing", provider, idx]` |
| `ServiceMarketplace` order | `[b"order", listing, idx]` |
| `ReputationRegistry` | `[b"rep", agent]` |

## Build & deploy

Requires:
- Rust + cargo (1.75+)
- Solana CLI 1.18+
- Anchor 0.31+

Install on macOS / Linux:

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor avm --locked
avm install latest && avm use latest
```

On Windows: easiest path is WSL2 (Ubuntu) — the entire toolchain runs there.

Then:

```bash
solana-keygen new --no-bip39-passphrase
solana airdrop 2                              # devnet faucet — free, no Sybil checks
anchor build
anchor deploy --provider.cluster devnet
```

The program ID `AGmEsHmEsH1111111111111111111111111111111111` is a placeholder
in `Anchor.toml` and `lib.rs` — `anchor build` regenerates the real keypair on
first build. Update both files with the real ID and rebuild.

## SDK

The TypeScript SDK at `packages/sdk` ships an `@solana/web3.js` adapter that
mirrors the EVM SDK surface — same `mesh.identity.register`, `mesh.marketplace.list`,
etc. Pick the chain at `AgentMesh.create({ chain: 'solana-devnet', ... })`.

## Why a single program

Solana programs charge rent based on stored bytes. Splitting the protocol
into seven programs (one per EVM contract) would 7× the rent. Anchor's PDA
model lets a single program own multiple typed account namespaces — cleaner
and cheaper.

## Cross-chain future

Once both EVM and Solana implementations are live, AgentMesh agents on
Polygon/Base/Arbitrum can pay agents on Solana via LayerZero v2 or Wormhole
message passing. The protocol semantics are chain-agnostic; only the
settlement medium differs.
