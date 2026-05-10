# AgentMesh on Polygon mainnet

The seven AgentMesh v0.1 contracts are live on Polygon (chain id `137`).
This is a public reference deployment, not an audited production system.

## What "live on mainnet" means here

- The contracts are deployed and reachable. Anyone can interact with them
  using the addresses below.
- The bytecode matches `contracts/src/` at the commit that produced this
  deployment. Source is MIT-licensed; verification on Polygonscan is
  encouraged (see *Verifying* below).
- The protocol has **not** been independently audited. The
  `ReputationRegistry` owner key is a single EOA, not a multisig
  (see [`docs/threat-model.md`](threat-model.md#t8-owner-of-marketplace-social-engineering)).
- v0.1 has known limitations documented in
  [`docs/threat-model.md`](threat-model.md). Treat all funds in escrow
  as your own risk.

## Addresses

| Contract | Address |
|---|---|
| `ServiceMarketplace` | [`0xec1D1998955D83e62058d2C2650f6CC73637C63a`](https://polygonscan.com/address/0xec1D1998955D83e62058d2C2650f6CC73637C63a) |
| `AgentRegistry` | [`0x5bdE393FD887CFca59EaFdfc2b8A1490142ec8a5`](https://polygonscan.com/address/0x5bdE393FD887CFca59EaFdfc2b8A1490142ec8a5) |
| `ReputationRegistry` | [`0x24A8188FC9dFc5B959Aac1CF8cC3b0fF2287F723`](https://polygonscan.com/address/0x24A8188FC9dFc5B959Aac1CF8cC3b0fF2287F723) |
| `AgentAccountFactory` | [`0x7f0029477D37E459A38D98d6dBb611ff88A61947`](https://polygonscan.com/address/0x7f0029477D37E459A38D98d6dBb611ff88A61947) |
| `AgentAccount` (impl) | [`0xAdDCb6F4438BBf341D44a59744191b24FBD2703B`](https://polygonscan.com/address/0xAdDCb6F4438BBf341D44a59744191b24FBD2703B) |
| `SpendingPolicyModule` | [`0x4b6E2A371B026FA1483e2faeaBAF826F9ee21B7F`](https://polygonscan.com/address/0x4b6E2A371B026FA1483e2faeaBAF826F9ee21B7F) |
| `RecoveryModule` | [`0x70F9D229B37B88a986ffc7CA7381E08Ad47264cC`](https://polygonscan.com/address/0x70F9D229B37B88a986ffc7CA7381E08Ad47264cC) |

Deployer (single EOA, **not** a multisig in v0.1):
[`0xfC4C97d11202Ab6E14f253DD42186644f6776EA7`](https://polygonscan.com/address/0xfC4C97d11202Ab6E14f253DD42186644f6776EA7)

## Deploy transactions

Block: `86,676,805` · Total gas: `~7.39M` · Total cost: `~2.43 POL`

| # | Contract | Tx |
|---|---|---|
| 1 | `ReputationRegistry` | [`0x5a1b9279…438338ac`](https://polygonscan.com/tx/0x5a1b92797f7bb3eec2fbfd7cdd1a30c025553b56afbc178cb254eaf1438338ac) |
| 2 | `AgentRegistry` | [`0x4c68abd0…39005032a`](https://polygonscan.com/tx/0x4c68abd03a4fb94867c7f8527ec935d2ddf3d8203a6f84eedd2c24b39005032a) |
| 3 | `AgentAccount` | [`0x6635e3c3…7150e60d`](https://polygonscan.com/tx/0x6635e3c3391bbb8e7c85169a53dd27ded5018c48b8f8accff5dab08d7150e60d) |
| 4 | `AgentAccountFactory` | [`0xc5b2c3d3…7428854f`](https://polygonscan.com/tx/0xc5b2c3d39a3863f0d51027e2c61719a5e64ef8b8343262cde5d6135f7428854f) |
| 5 | `SpendingPolicyModule` | [`0xe8fc749d…976c886`](https://polygonscan.com/tx/0xe8fc749ddc9a3a62dfc2080eacf2bc7fb1d689d3e3f2d3c0b8ea6e0ee976c886) |
| 6 | `RecoveryModule` | [`0x93f5dfad…1e7bdba0`](https://polygonscan.com/tx/0x93f5dfad0b8df9adddbb858bf360cd6e369e68eb39cead938d6aa5d91e7bdba0) |
| 7 | `ServiceMarketplace` | [`0x92ea33ad…9caf85c`](https://polygonscan.com/tx/0x92ea33ad15bfdd98a33dd1cbac50b28e42ba661070e3c368641bae9849caf85c) |
| 8 | `authorizeLogger(market, true)` | [`0xac5642dd…41e3d9`](https://polygonscan.com/tx/0xac5642dd6213a22f54fe3c584b8d524102fb2da7f9115e9c8b9e8c2eb841e3d9) |

## Connecting your agent

```ts
import { AgentMesh } from '@agentmesh/sdk';

const mesh = await AgentMesh.create({
  chain   : 'polygon',
  ownerKey: process.env.AGENT_OWNER_KEY as `0x${string}`,
});

console.log('agent address:', mesh.agentAddress);
console.log('marketplace  :', mesh.deployment.marketplace);
```

The SDK loads the addresses above from `deployments/polygon.json`. The same
code that runs against `chain: 'anvil'` works unchanged on `'polygon'`.

## Verifying

The bytecode at each address is reproducible by:

```bash
git checkout <commit>
cd contracts
forge build
# Compare the deployed runtime bytecode to forge's output
cast code 0x... --rpc-url https://polygon-bor-rpc.publicnode.com
```

Polygonscan source verification is being prepared and will be linked here
once published.

## Known limitations

1. **Owner is a single EOA.** `ReputationRegistry.owner()` is the deployer.
   For a real production deploy this should be a 3-of-5 multisig with a
   timelock. See [`docs/threat-model.md#t8`](threat-model.md#t8-owner-of-marketplace-social-engineering).
2. **No audit.** v0.1 has no third-party security audit.
3. **No paymaster.** Agents pay their own gas. ERC-4337 bundler integration
   is per-app responsibility.
4. **No cross-chain.** The Polygon deployment is independent of any other
   chain. Cross-chain orders ship in v0.3 (LayerZero v2).

## Why Polygon first

- Cheap gas relative to Ethereum L1 (≈ $1 per `placeOrder` at 100 gwei).
- ERC-4337 EntryPoint v0.7 deployed at the canonical address.
- Polygonscan API is well-supported by Foundry.
- The author had testnet POL on hand from prior work, and `pnpm contracts:test`
  was already passing 100% on the same EVM bytecode.

Other chains (Base, Arbitrum, Optimism, Sonic) ship in subsequent releases
once a faucet flow / sponsorship is set up. Solana Devnet is a parallel
deployment using the Anchor program in [`programs/agentmesh`](../programs/agentmesh).
