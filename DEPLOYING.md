# Deploying AgentMesh

Hands-on guide for pushing AgentMesh contracts onto a public chain.

## TL;DR

```powershell
# 1. Generate a deployer key (or supply your own)
pnpm run deploy:keygen          # writes .env.deployer (gitignored)

# 2. Fund the deployer (testnet faucets; see FAUCETS.md)
# 3. Deploy
pnpm run deploy:multichain      # deploys to every funded chain
```

## Step 1 — deployer key

`scripts/deploy-multichain.ps1` reads `.env.deployer`. To create one:

```powershell
$key = node -e "import('viem/accounts').then(({generatePrivateKey, privateKeyToAccount}) => { const k = generatePrivateKey(); console.log('PK=' + k); console.log('ADDR=' + privateKeyToAccount(k).address); })"
```

Or with cast:

```powershell
& "$env:USERPROFILE\.foundry\bin\cast.exe" wallet new
```

Save to `.env.deployer`:
```
DEPLOYER_ADDRESS=0x...
DEPLOYER_PRIVATE_KEY=0x...
```

## Step 2 — fund

See [FAUCETS.md](FAUCETS.md) for chain-by-chain faucet links. Minimum balance per chain:

| Chain | Minimum | Reason |
|---|---|---|
| Polygon Amoy | **0.6 POL** | gas runs hot (~80 gwei) |
| Base Sepolia | 0.05 ETH | extremely cheap (≪1 gwei) |
| Arbitrum Sepolia | 0.05 ETH | also cheap |
| Optimism Sepolia | 0.05 ETH | cheap |
| Sonic Testnet | 5 S | cheap |

Most faucets in 2026 require **at least 0.001 ETH on Ethereum mainnet** as
anti-Sybil. The cleanest workaround: send ~$3 of ETH from any exchange to the
deployer. That single deposit unlocks every Alchemy faucet.

## Step 3 — multi-chain deploy

```powershell
pnpm run deploy:multichain
```

The script:
1. Loads `.env.deployer`
2. Iterates chains
3. Skips any chain with < 0.05 native (with a yellow log line)
4. Runs `forge script Deploy.s.sol` against each funded chain
5. Writes addresses to `deployments/<chain>.json`

## Step 4 — Solana

See `programs/agentmesh/README.md`. Solana devnet has a built-in airdrop
(`solana airdrop 2`) so it doesn't need faucet workarounds. Anchor toolchain
required.

```bash
anchor build
anchor deploy --provider.cluster devnet
```

## Step 5 — site refresh

After deploy, update `apps/site/components/ChainBar.tsx` to flip status from
`planned` to `live` and add the explorer URL. Then:

```powershell
pnpm --filter @agentmesh/site build
vercel --prod
```

The site's "live on" ribbon now shows green dots where contracts are live.

## Troubleshooting

**"insufficient funds for gas"** — the chain's gas price is higher than usual.
Check current gas:
```powershell
cast gas-price --rpc-url <RPC>
```
Multiply by ~7M (total deploy gas) to see the floor cost.

**"already deployed"** — `forge script` is idempotent at the script level but
contracts are deployed to fresh addresses every run. To redeploy in place,
delete `deployments/<chain>.json` first.

**"nonce too low"** — your deployer key was used elsewhere. Either wait for
chain to catch up, or rotate the key.

**Faucet rejects** — see FAUCETS.md, try a different faucet, or fund manually
from an exchange.

## Mainnet

**Don't.** AgentMesh v0.1 is unaudited. Deploy to mainnet only after:
1. Trail of Bits or Spearbit audit
2. 30+ days on testnet without incident
3. Bug bounty program live ($10k+ pool)
4. Circuit breakers in place
5. Multi-sig owner (not a single key)

The roadmap in `docs/roadmap.md` reaches mainnet at v1.0.
