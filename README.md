# AgentMesh

Six-layer protocol stack for the autonomous AI agent economy. Identity,
Wallet, Payment, Discovery, Marketplace, and Reputation — all on-chain,
all composable.

> **Status:** v0.1 — **live on Polygon mainnet** (block 86,676,805). Local
> anvil flow runs end-to-end. Other chains have deploy scripts ready.
> Contracts are **unaudited** — treat the live deployment as a public
> reference, not a trustless production system. Use real funds at your
> own risk.

## Live on Polygon mainnet

| Contract | Address |
|---|---|
| `ServiceMarketplace` | [`0xec1D1998955D83e62058d2C2650f6CC73637C63a`](https://polygonscan.com/address/0xec1D1998955D83e62058d2C2650f6CC73637C63a) |
| `AgentRegistry` | [`0x5bdE393FD887CFca59EaFdfc2b8A1490142ec8a5`](https://polygonscan.com/address/0x5bdE393FD887CFca59EaFdfc2b8A1490142ec8a5) |
| `ReputationRegistry` | [`0x24A8188FC9dFc5B959Aac1CF8cC3b0fF2287F723`](https://polygonscan.com/address/0x24A8188FC9dFc5B959Aac1CF8cC3b0fF2287F723) |
| `AgentAccountFactory` | [`0x7f0029477D37E459A38D98d6dBb611ff88A61947`](https://polygonscan.com/address/0x7f0029477D37E459A38D98d6dBb611ff88A61947) |
| `AgentAccount` (impl) | [`0xAdDCb6F4438BBf341D44a59744191b24FBD2703B`](https://polygonscan.com/address/0xAdDCb6F4438BBf341D44a59744191b24FBD2703B) |
| `SpendingPolicyModule` | [`0x4b6E2A371B026FA1483e2faeaBAF826F9ee21B7F`](https://polygonscan.com/address/0x4b6E2A371B026FA1483e2faeaBAF826F9ee21B7F) |
| `RecoveryModule` | [`0x70F9D229B37B88a986ffc7CA7381E08Ad47264cC`](https://polygonscan.com/address/0x70F9D229B37B88a986ffc7CA7381E08Ad47264cC) |

All seven contracts are **source-verified on Polygonscan** (green tick).
Full deployment record incl. tx hashes:
[`deployments/polygon.json`](deployments/polygon.json) · [`docs/mainnet.md`](docs/mainnet.md)

## Multi-chain status

The protocol has zero chain-specific code; every layer compiles to the
same bytecode anywhere. What's deployed where:

| Chain | Status | Notes |
|---|---|---|
| Polygon mainnet (137) | 🟢 **live + verified** | Reference deployment — addresses above |
| Polygon Amoy (80002) | ⚪ deploy-ready | `pnpm run deploy:amoy` (faucet POL needed) |
| Base Sepolia (84532) | ⚪ deploy-ready | `pnpm run deploy:multichain` |
| Arbitrum Sepolia (421614) | ⚪ deploy-ready | same |
| Optimism Sepolia (11155420) | ⚪ deploy-ready | same |
| Sonic testnet (64165) | ⚪ deploy-ready | same |
| Solana Devnet | ⚪ code-complete | Anchor program in [`programs/agentmesh/`](programs/agentmesh/), needs `solana program deploy` |
| Base / Arbitrum / Optimism mainnet | ⚪ deploy-ready | same `Deploy.s.sol`, ~$5-10 gas each |

The SDK switches chains with one field:

```ts
await AgentMesh.create({ chain: 'polygon' });          // ← live now
await AgentMesh.create({ chain: 'amoy' });             // ← any deploy-ready chain
await AgentMesh.create({ chain: 'base-sepolia' });
```

## The six layers

| # | Layer | Contract / package | What it does |
|---|---|---|---|
| 1 | **Identity** | `AgentRegistry` | On-chain name + capability set per agent |
| 2 | **Wallet** | `AgentAccount` + `AgentAccountFactory` | ERC-4337 dual-path account, ERC-7579 module hooks |
| 3 | **Payment** | `@agentmesh/x402-server`, `@agentmesh/x402-client` | HTTP 402 + marketplace-backed settlement |
| 4 | **Discovery** | `AgentRegistry.findByCapability` | Capability-hash search index |
| 5 | **Marketplace** | `ServiceMarketplace` | Escrowed orders, timeout refund |
| 6 | **Reputation** | `ReputationRegistry` | Append-only stats + 0..10000 score |

## Quick start

Requirements:
- Node 20+
- pnpm 9+ (`npm i -g pnpm` or `corepack enable pnpm`)
- Foundry (this repo includes a Windows-portable layout — `foundryup` on
  Linux/macOS, or download the Windows binary from
  https://github.com/foundry-rs/foundry/releases)

```powershell
git clone https://github.com/enesakb/agentmesh && cd agentmesh
pnpm install
pnpm contracts:test           # 64 unit + integration tests, all green
pnpm demo                     # spawns anvil + deploys + runs alpha & beta
```

You should see, at the end:

```
=================================================
  ✅ End-to-end demo successful
=================================================
  city        : Berlin
  data        : {"city":"Berlin","tempC":22,"source":"demo-alpha","orderId":"1"}
  paid        : 0.001 ETH
  alpha rep   : success=1 score=1000
  beta  rep   : success=1 score=1000
=================================================
```

## What `pnpm demo` does

1. Starts `anvil` if not already running (chain id 31337).
2. Deploys the seven AgentMesh contracts; writes addresses to
   [`deployments/anvil.json`](deployments/anvil.json).
3. Boots `apps/demo-alpha` (provider): creates a smart account, registers,
   installs a spending policy, lists `/weather` on the marketplace, starts
   an Express server with x402 middleware.
4. Boots `apps/demo-beta` (consumer): creates a smart account, registers,
   discovers alpha by capability `data.weather`, places an order through
   x402 (HTTP 402 → place order → retry with `X-PAYMENT`), receives data,
   reads reputation for both sides.

[See the architecture diagram](docs/architecture.md) for the full sequence.

## Repo layout

```
agentmesh/
├── contracts/             Foundry project — Solidity + tests + deploy
│   ├── src/
│   │   ├── identity/      AgentRegistry
│   │   ├── wallet/        AgentAccount, Factory, modules
│   │   ├── marketplace/   ServiceMarketplace
│   │   ├── reputation/    ReputationRegistry
│   │   └── interfaces/
│   └── test/              64 tests, integration + unit
├── packages/
│   ├── shared/            ABIs, deployment loader, capability hashes
│   ├── x402-server/       Express middleware
│   ├── x402-client/       fetch() wrapper
│   └── sdk/               High-level @agentmesh/sdk
├── apps/
│   ├── demo-alpha/        Provider agent
│   └── demo-beta/         Consumer agent
├── docs/
│   ├── architecture.md
│   ├── protocol-spec.md
│   ├── research-notes.md
│   ├── roadmap.md
│   └── decisions/         6 ADRs
├── scripts/
│   ├── deploy-local.ps1
│   ├── deploy-amoy.ps1
│   └── run-demo.ps1
└── deployments/           Per-chain addresses (anvil.json, amoy.json, …)
```

## Try it on Polygon mainnet

The reference deployment is live — point the SDK at it and you're done:

```ts
import { AgentMesh } from '@agentmesh/sdk';
import { parseEther } from 'viem';

const mesh = await AgentMesh.create({
  chain   : 'polygon',
  ownerKey: process.env.AGENT_OWNER_KEY as `0x${string}`,
});

console.log('marketplace :', mesh.deployment.marketplace);
// 0xec1D1998955D83e62058d2C2650f6CC73637C63a — verified at
// https://polygonscan.com/address/0xec1D1998955D83e62058d2C2650f6CC73637C63a

const providers = await mesh.discovery.findByCapability('data.weather');
console.log('weather agents on mainnet:', providers);
```

Real POL is required for any write — fund the EOA with ~0.5 POL for the
smart-account create + a couple of orders. The full integration walk-through
lives in [`docs/integration-guide.md`](docs/integration-guide.md).

## Deploying your own stack (testnet / fresh mainnet)

```powershell
$env:PRIVATE_KEY_DEPLOYER = '<funded testnet key>'
pnpm run deploy:amoy        # Polygon Amoy testnet
# pnpm run deploy:polygon   # Polygon mainnet (~3 POL gas)
```

You'll get a deployer-funded smart-account stack at fresh CREATE2 addresses.
Testnet faucet (if you're low on MATIC): https://faucet.polygon.technology.

After mainnet deploy, register the deployer as the first agent so the
ecosystem isn't empty:

```powershell
pnpm run bootstrap:genesis
```

## Using the SDK locally

```ts
import { AgentMesh } from '@agentmesh/sdk';
import { parseEther } from 'viem';

const mesh = await AgentMesh.create({
  chain: 'anvil',                       // or 'polygon', 'amoy', 'base-sepolia'
  ownerKey: process.env.PRIVATE_KEY as `0x${string}`,
});

await mesh.wallet.create();
await mesh.wallet.fund(parseEther('1'));
await mesh.wallet.installPolicy({
  dailyLimitWei: parseEther('1'),
  perTxLimitWei: parseEther('0.5'),
});

await mesh.identity.register({
  name: 'my-weather-agent',
  metadataURI: 'ipfs://bafy…',
  capabilities: ['data.weather'],
});

const listingId = await mesh.marketplace.list({
  serviceURI: 'https://my-agent.example/weather',
  priceWei: parseEther('0.001'),
});

// As a consumer …
const providers = await mesh.discovery.findByCapability('data.weather');
const res = await mesh.payment.fetchWithPayment({
  url: 'https://my-agent.example/weather/Berlin',
  maxAmountWei: parseEther('0.01'),
});

const rep = await mesh.reputation.get(providers[0]);
console.log(rep.score.toString());     // "1000" after a single successful trade
```

## Roadmap & decisions

- [docs/roadmap.md](docs/roadmap.md) — what comes after v0.1.
- [docs/decisions/](docs/decisions/) — six ADRs documenting every load-bearing
  design choice.

## License

MIT.
