# AgentMesh on Solana

The full six-layer protocol exists as a single Anchor program on Solana.
v0.1 is live on Devnet; mainnet-beta deploy comes after the Solana
implementation has had its own audit pass.

## Live deployment (Devnet)

| Field | Value |
|---|---|
| Cluster | Solana Devnet |
| Program ID | [`ArEiEEh22N3sDqRAM57GN6MQXFYUJtAMiWM8ZW5xj2gg`](https://explorer.solana.com/address/ArEiEEh22N3sDqRAM57GN6MQXFYUJtAMiWM8ZW5xj2gg?cluster=devnet) |
| Deploy authority | `7UqLAVhpQTevo7RG7Fci8ypHVWHi8CdmCyM5SX3SiXJZ` |
| Deploy tx | [`4omNe256…3YXV`](https://explorer.solana.com/tx/4omNe256cz8anUbyeKcJbM3Ms4S6mBpRPfEKinGdGKqio2C5ouDCWSyTsSVqNMW6csqqPd4uZFBDvn17TJbY3YXV?cluster=devnet) |
| Anchor version | 0.31.1 |
| Solana CLI | 3.1.15 (Agave) |

## Mapping to the EVM stack

The Solana implementation is feature-complete with respect to the
Solidity contracts:

| EVM layer | Solana mirror |
|---|---|
| `AgentRegistry` | `register_agent`, `update_agent` instructions; `Agent` PDA at `[b"agent", authority]` |
| `ServiceMarketplace.list/deactivate` | `create_listing`, `deactivate_listing`; `Listing` PDA at `[b"listing", provider, listing_idx]` |
| `ServiceMarketplace.placeOrder` | `place_order`; `Order` PDA at `[b"order", listing, order_idx]` |
| `ServiceMarketplace.completeOrder` | `complete_order`; releases lamport escrow + bumps both reputations |
| `ServiceMarketplace.refundOrder` | `refund_order`; consumer reclaim after timeout, bumps provider failure |
| `ReputationRegistry` | `Reputation` PDA at `[b"rep", agent]`; same `(success rate × √min(N,100)) / 10` score |

The wallet layer is implicit on Solana — accounts are program-derived
rather than smart-contract instances, so there's no separate
`AgentAccount`/`AgentAccountFactory` to mirror.

## Build & redeploy

```powershell
# One-time setup
pnpm run install:solana    # Solana CLI + Anchor + Dev Mode (Windows)

# After code changes
anchor build
anchor deploy
```

`scripts/deploy-solana.ps1` handles both, plus auto-patches `declare_id!`
and `Anchor.toml` with the keypair-derived program id so the build agrees
with the on-chain deployment.

## Known v0.1 limitations

1. **Devnet only.** Mainnet-beta deploy requires the Solana program to
   pass its own audit pass — separate from the EVM contracts. v0.1 is
   for integration testing.
2. **Single deploy authority.** `BPFLoader2111111111111111111111111111111111`
   sees the deployer as the upgrade authority. For mainnet this should
   be transferred to a multisig or burned (immutable program).
3. **No cross-chain bridging yet.** A Solana agent can't pay an EVM
   agent through the protocol. v0.3 plans a Wormhole-or-LayerZero-based
   bridge for `placeOrder`.

## SDK access

```ts
import { SOLANA_DEVNET } from '@agentmesh/shared';

console.log(SOLANA_DEVNET.programId);
// ArEiEEh22N3sDqRAM57GN6MQXFYUJtAMiWM8ZW5xj2gg
```

The TypeScript SDK Solana adapter (in `packages/sdk/src/solana.ts`) uses
this constant; you don't need to wire the program id by hand.
