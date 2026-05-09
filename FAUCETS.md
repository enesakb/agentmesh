# Funding the deployer wallet

The deployer wallet for AgentMesh testnet deploys is

```
0xE0e153487eB0415d30c73319f7e42eAE99DA8bC8
```

Private key lives in `.env.deployer` (gitignored — never committed).

To get the contracts live on every chain, fund this address from each faucet
below. Most faucets let you paste the address and click once. Do this when you
have ~10 minutes — total cost: $0.

## Faucet checklist

| # | Chain | Faucet | What to ask for | Per-claim |
|---|---|---|---|---|
| 1 | Polygon Amoy | https://faucet.polygon.technology/ | 0.5 MATIC | 0.5 |
| 2 | Base Sepolia | https://www.alchemy.com/faucets/base-sepolia | 0.5 ETH | 0.1 |
| 3 | Arbitrum Sepolia | https://www.alchemy.com/faucets/arbitrum-sepolia | 0.5 ETH | 0.1 |
| 4 | Optimism Sepolia | https://app.optimism.io/faucet | 0.5 ETH | 0.1 |
| 5 | Sonic Testnet | https://testnet.soniclabs.com/account | 100 S | 100 |

Some faucets require:
- A small mainnet-balance check on the same wallet (Alchemy faucets — easy
  workaround: link any mainnet address you already own; Alchemy uses social
  proof not balance proof in most cases now)
- A Twitter / Discord / GitHub login
- Once-per-day rate limits

If a faucet rejects you, try another one (Quicknode, Chainstack, GetBlock all
run public faucets too).

## Once funded

```powershell
pnpm run deploy:multichain
```

The script (`scripts/deploy-multichain.ps1`) reads each chain's RPC, checks the
deployer balance, skips any chain with < 0.05 native, and deploys to the rest.
Addresses are written to `deployments/<chain>.json` per chain.

After deploy, the **site's "live on" ribbon** flips from amber `(soon)` to
phosphor green `live` for each completed chain — it reads `deployments/*.json`
at build time. Re-deploy the site (`vercel --prod`) and the change is live.

## Why so many chains?

- Polygon Amoy: easiest faucet, biggest EVM testnet user base
- Base Sepolia: home of Virtuals Protocol, biggest agent ecosystem on EVM
- Arbitrum Sepolia: cheapest mainnet path post-launch
- Optimism Sepolia: Superchain composability
- Sonic: high-throughput L1, 10k TPS, growing agent activity

Multi-chain deploy isn't vanity — it's the bet that the agent economy spans
chains, not lives in one. Every faucet you hit makes AgentMesh real on one
more network.
