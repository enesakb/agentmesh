# Funding the deployer wallet

## Step 1 — make a fresh deployer wallet (don't reuse personal keys)

```powershell
& "$env:USERPROFILE\.foundry\bin\cast.exe" wallet new
```

That prints an `address` and a `private_key`. Save them to `.env.deployer`
(gitignored, never committed):

```
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
```

## Step 2 — fund the address from each chain's faucet

Replace `<YOUR_DEPLOYER_ADDRESS>` below with the address you generated in
step 1.

| # | Chain | Faucet | Per-claim |
|---|---|---|---|
| 1 | Polygon Amoy | https://faucet.polygon.technology/ | 0.5 POL |
| 2 | Base Sepolia | https://www.alchemy.com/faucets/base-sepolia | 0.1 ETH |
| 3 | Arbitrum Sepolia | https://www.alchemy.com/faucets/arbitrum-sepolia | 0.1 ETH |
| 4 | Optimism Sepolia | https://app.optimism.io/faucet | 0.1 ETH |
| 5 | Sonic Testnet | https://testnet.soniclabs.com/account | 100 S |

### Common gating

Most faucets in 2026 require **at least 0.001 ETH on Ethereum mainnet** as
anti-Sybil. The cleanest workaround: send ~$3 of ETH from any exchange to the
deployer once. That single deposit unlocks every Alchemy faucet across every
chain.

If a faucet rejects you, try another (Stakely, QuickNode, Triangle Platform,
Bware Labs, Chainstack — all run public taps).

### Minimum balance per chain

| Chain | Need | Reason |
|---|---|---|
| Polygon Amoy | **0.6 POL** | gas runs hot (~80 gwei) |
| Base Sepolia | 0.05 ETH | extremely cheap (≪1 gwei) |
| Arbitrum Sepolia | 0.05 ETH | also cheap |
| Optimism Sepolia | 0.05 ETH | cheap |
| Sonic Testnet | 5 S | cheap |

## Step 3 — multi-chain deploy

```powershell
pnpm run deploy:multichain
```

The script (`scripts/deploy-multichain.ps1`):
1. Reads `.env.deployer`
2. Iterates the chain list
3. Skips any chain with < 0.05 native (with a yellow log line)
4. Runs `forge script Deploy.s.sol` on each funded chain
5. Writes addresses to `deployments/<chain>.json` per chain
   (these files are gitignored — they're per-developer)

## Step 4 — flip the site's "live on" ribbon

After deploy, edit `apps/site/components/ChainBar.tsx` to flip a chain's
status from `planned` to `live`. The badge turns from amber to phosphor green.
Document the public address in `docs/deployments.md` so the next developer
doesn't need to redeploy.

## Why so many chains?

- **Polygon Amoy** — easiest faucet, biggest EVM testnet user base
- **Base Sepolia** — home of Virtuals Protocol, biggest agent ecosystem on EVM
- **Arbitrum Sepolia** — cheapest mainnet path post-launch
- **Optimism Sepolia** — Superchain composability
- **Sonic Testnet** — high-throughput L1, 10k TPS, growing agent activity

Multi-chain isn't vanity — it's the bet that the agent economy spans chains,
not lives in one. Every faucet you hit makes AgentMesh real on one more
network.
