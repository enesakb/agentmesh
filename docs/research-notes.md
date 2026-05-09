# Phase 0 Research Notes

Working notes captured before / during construction of the AgentMesh MVP.
This document is a snapshot — it is *not* a substitute for reading the live
specs at the linked sources.

## 1. Standards landscape

### ERC-4337 (Account Abstraction)

- v0.7 EntryPoint: `0x0000000071727De22E5E9d8BAf0edAc6f37da032` (same address
  on every EVM chain, deployed via deterministic CREATE2).
- A `PackedUserOperation` is a single struct (sender, nonce, packed gas, init
  code, calldata, signature). Bundlers (Pimlico) collect UserOps and submit
  `EntryPoint.handleOps([])`.
- For a smart account to be 4337-compliant it implements
  `validateUserOp(userOp, userOpHash, missingFunds) returns (uint256
  validationData)`. We implement the minimum: the signature is an
  owner-ECDSA over `userOpHash`.
- Trade-off in MVP: full UserOp flow is overkill for a local demo, so
  `AgentAccount.execute()` is *also* callable directly by `owner`. On
  testnet/mainnet the ERC-4337 path is the canonical one (gas via paymaster,
  stealth wallets, simulation via bundler).

### ERC-7579 (Modular Account)

- Module type IDs: `1` validator, `2` executor, `3` fallback, `4` hook.
- Hooks are run before execution and may revert to block the call.
- We support multiple hooks per account (cap: `MAX_HOOKS = 8`). The hook
  iteration runs `IPolicyHook.checkAndUpdate(account, target, value, data)`
  on each.
- Validators / executors / fallbacks are reserved interfaces in MVP — the
  surface compiles but isn't exercised yet.

### ERC-8004 (Agent Identity)

- Draft EIP for "trustless agent identity". Conceptually: an agent is a
  combination of (smart account, name, capability set, off-chain metadata).
- No widely-deployed canonical reference. Several projects implement
  variants (ai16z Eliza, Virtuals, Olas).
- Our `AgentRegistry` is a minimal-but-faithful take: name → addr, capability
  hash → addr list. Compatible enough that an ERC-8004 resolver could read
  our registry as a backing store.

### x402 (HTTP 402 payment standard)

- Coinbase's spec: a server returns `HTTP 402` with a JSON body listing
  `accepts` (one per accepted scheme); client picks one, settles payment,
  retries with `X-PAYMENT` header.
- Reference implementation uses signed EIP-3009 USDC transfers. Settlement
  is "lazy" — server submits the payment authorization on-chain only on
  successful delivery.
- For MVP we implemented a marketplace-backed scheme (`agentmesh-marketplace`)
  where the payment proof is an `orderId` from `ServiceMarketplace`. The
  consumer escrows funds in advance; the provider claims them on delivery.
  This is more aligned with how AgentMesh's other layers behave (escrow +
  reputation).

### Ethereum Attestation Service (EAS) — for reputation

- EAS provides on-chain attestations with arbitrary schemas.
- Considered for ReputationRegistry. Decided against it for MVP because:
  1. Adds a heavy dependency.
  2. EAS attestations are pull-based; our marketplace pushes events on
     completion, which a custom logger captures more cheaply.
  3. EAS makes sense once we have *third-party* attesters (auditors,
     dispute resolvers). For MVP, only `ServiceMarketplace` writes.
- Future: keep ReputationRegistry as a primary store, *also* mirror events
  as EAS attestations so downstream tools can query through a standard.

## 2. Bundler / Paymaster infra

- **Pimlico** — hosted bundler + paymaster. Free tier covers Polygon Amoy
  and Base Sepolia. SDK: `permissionless` (built on viem).
- API key supplied by the user; loaded into `.env` (never committed).
- Polygon Amoy (chain id 80002) has `EntryPoint` deployed at the canonical
  address. Verified by checking `cast code 0x0000000071727De22E5E9d8BAf0edAc6f37da032 --rpc-url $POLYGON_AMOY_RPC`.

## 3. Market scan — where AgentMesh fits

| Project / stack | Identity | Wallet | Payment | Marketplace | Reputation |
|---|---|---|---|---|---|
| ai16z Eliza | partial (off-chain) | wallet plugin | — | — | — |
| Virtuals Protocol | yes (token-gated) | yes (delegated) | yes (token) | partial | — |
| Olas (Autonolas) | yes | yes | partial | bounty marketplace | partial |
| Coinbase x402 | — | — | yes (HTTP std) | — | — |
| AgentMesh (this) | yes (ERC-8004ish) | yes (4337+7579) | yes (x402+escrow) | yes (escrow) | yes |

The bet: every project above does 1–3 layers; AgentMesh ties all six together
in a single composable stack with public on-chain primitives. Apps building
agent commerce don't have to glue 4 projects together.

Open questions left to a future session:
- Token-of-account (USDC / USDT) instead of native ETH for marketplace.
- Off-chain capability-search index for performance at scale (>10k agents).
- Agent-to-agent direct payment (no marketplace), with reputation logger
  separate from `ServiceMarketplace`.

## 4. Ethics and risk

Autonomous spending is the single biggest risk. An agent with a wrong loop
or a broken prompt can drain its wallet. Mitigations baked into MVP:

1. `SpendingPolicyModule` — daily limit + per-tx limit, enforced as an
   ERC-7579 hook on every `execute`. Rolling 24-hour window.
2. Target blacklist on the same module (per-account).
3. `RecoveryModule` — Argent-style M-of-N guardian recovery with a 48h
   timelock; the active owner can cancel any in-flight recovery.

Compliance (Germany): cold notes, *not legal advice* —
- Money transmission: a marketplace that holds escrow may trigger BaFin
  scrutiny. MVP is on testnet only; mainnet would require legal review.
- GDPR: no PII stored on-chain; `metadataURI` should not contain personal
  data. Off-chain agents that interact with humans must follow GDPR rules.
- AGB / consumer protection: agent-to-agent transactions are B2B by default.
  Agent-to-human flows require human-side opt-in and disclosure.

## 5. Working defaults

- Solc: 0.8.28
- OpenZeppelin: v5.1.0
- Foundry: v1.7.1
- Viem: 2.21+ (single version forced via pnpm overrides)
- Pimlico: free tier (key in `.env`, never committed)
- Primary chain: Polygon Amoy (80002); demo chain: anvil (31337)
