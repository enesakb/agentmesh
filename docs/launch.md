# Launch communication kit

Copy-pasteable threads, blurbs, and answers for when the project is ready for
public attention. Tone: technical, confident, slightly underground — same as
the site.

---

## Twitter / X — 12-tweet thread

**Tweet 1**
> AgentMesh — a six-layer protocol stack for the autonomous AI agent economy.
>
> Identity. Wallet. Payment. Discovery. Marketplace. Reputation.
>
> One composable stack. EVM + Solana. 99 tests green. Demo running live in your browser ↓
>
> https://agentmesh-neon.vercel.app

**Tweet 2 (problem)**
> Today, two AI agents can't trade with each other.
>
> No identity → can't be banned for misbehaving.
> No wallet → can't hold earnings.
> No standard payment → back to humans-with-cards.
> No discovery → centralised directory takes 30%.
>
> Every glue project rots under the next protocol upgrade.

**Tweet 3 (the bet)**
> AgentMesh's bet: the agent economy is bottlenecked by missing public
> infrastructure, not by missing AI capability.
>
> Build the bridges between the islands → unlock micropayments, agent
> subcontracting, verifiable reputation.

**Tweet 4 (Layer 1: Identity)**
> 01 — IDENTITY
>
> AgentRegistry. Each agent claims a unique name + capability set,
> indexed by keccak256(capability) for on-chain discovery.
>
> ERC-8004-compatible surface. Pull-based, censorship-resistant.

**Tweet 5 (Layer 2: Wallet)**
> 02 — WALLET
>
> AgentAccount: ERC-4337 v0.7 dual-path smart wallet.
>
> ERC-7579 modular hooks: spending policies (1Ξ/day, 0.5Ξ/tx) enforced
> on every execute. Argent-style 48h M-of-N social recovery.

**Tweet 6 (Layer 3: Payment)**
> 03 — PAYMENT
>
> x402 — Coinbase's HTTP 402 standard, bound to a marketplace order.
>
> Consumer escrows ETH, gets an orderId, sends GET /resource with
> X-PAYMENT header. Server verifies on-chain, serves data, claims escrow.
>
> Real payments inline with HTTP.

**Tweet 7 (Layer 4: Discovery)**
> 04 — DISCOVERY
>
> findByCapability(bytes32) returns the address list of every agent
> claiming that capability. No directory operator, no skim.
>
> Capability hashes are the names you'd type: data.weather,
> compute.image, data.crypto-price.

**Tweet 8 (Layer 5: Marketplace)**
> 05 — MARKETPLACE
>
> ServiceMarketplace — escrowed orders with a 1-hour timeout.
>
> No oracle, no jury — provider completes or consumer refunds.
> Reputation logged on every outcome. Stress-tested at 200 orders ×
> 100 agents → 0 wei escrow leak.

**Tweet 9 (Layer 6: Reputation)**
> 06 — REPUTATION
>
> Append-only, on-chain. Score = (successRate · √min(N,100)) / 10.
>
> 1 successful tx → 1000.
> 100 perfect tx → 10000.
> 10 failures out of 100 → 9000.
>
> Sybils can't fake history cheaply. The notebook is public.

**Tweet 10 (live demo)**
> Try it right now — no setup:
>
> https://agentmesh-neon.vercel.app/#try
>
> Click "fetch /weather/Berlin" → real HTTP 402 → place an order → retry
> with X-PAYMENT → get real weather data. Real Vercel Edge Function. Real
> x402 protocol. Real replay protection.

**Tweet 11 (multi-chain)**
> Chain-agnostic by design.
>
> EVM: Solidity contracts in /contracts (Foundry, OZ v5).
> Solana: Anchor program in /programs/agentmesh (Rust, PDA-rooted state).
>
> Same protocol semantics, two stacks. Cross-chain comes next.

**Tweet 12 (call to action)**
> 99 tests passing. 7 invariants asserted. 6 ADRs documenting every
> load-bearing decision.
>
> 📦 https://github.com/enesakb/agentmesh
> 🌐 https://agentmesh-neon.vercel.app
> 📜 MIT licensed
>
> If you build agents, fork it. If you build the chain, ship integrations.
> If you build neither, share the demo with someone who does.

---

## Hacker News post

**Title**: AgentMesh — a six-layer protocol stack for the AI agent economy

**Body**:
> Hi HN, I built AgentMesh — a public-good protocol for autonomous agents
> to trade with each other on-chain.
>
> The thesis: today's AI agents inherit none of the rails that humans
> use to transact. They can't hold money, can't prove identity, can't
> pay each other without a human standing behind them. As agents become
> more autonomous, this gap matters more.
>
> The protocol is six layers: Identity (AgentRegistry), Wallet
> (ERC-4337 + ERC-7579 modular smart account), Payment (HTTP 402
> bound to marketplace orders), Discovery (capability-hash search),
> Marketplace (native-ETH escrow with 1h timeout), and Reputation
> (append-only on-chain stats with a sqrt-confidence score).
>
> Each layer is intentionally minimal — you can read the full Solidity
> in an afternoon. Every load-bearing decision has an ADR. The MVP runs
> end-to-end against local anvil with two real agent processes — one
> serves weather data, the other discovers, pays via x402, and gets
> data back.
>
> What's interesting:
> - x402 (Coinbase's HTTP 402 standard) bound to marketplace orders gives
>   you payments + escrow + reputation in one wire format
> - ERC-4337 dual-path: same account works under bundlers (Pimlico) or
>   direct EOA calls. You can test on local anvil and ship to Polygon
>   Amoy without rewrites.
> - Anchor program (Solana) is code-complete with the same semantics
>   — same score formula, same wire format, different settlement medium.
>
> What's not done:
> - No mainnet. No audit. Still v0.1.
> - Real testnet deploy waiting on testnet ETH (faucets need anti-Sybil
>   workarounds in 2026).
>
> Repo: https://github.com/enesakb/agentmesh
> Live demo: https://agentmesh-neon.vercel.app
>
> Curious for feedback — especially from people building agent
> infrastructure (ai16z, Virtuals, Olas, Pimlico). What's missing? What's
> wrong? What's worth doubling down on?

---

## Dev.to / Mirror long-form

[draft — flesh out from manifesto.md and roadmap.md]

Title: "Building AgentMesh: a protocol for AI agents to trade with each other"

Sections:
1. The choke point (why this exists)
2. Pizza shop analogy (HowItWorks section)
3. Six layers, one stack (architecture)
4. Why ERC-4337 + ERC-7579 + x402 is the right combo
5. Stress test results (LoadTest data)
6. Multi-chain path (EVM + Solana)
7. What v1.0 looks like (audit, mainnet, cross-chain)
8. Call for contributors

---

## Reddit r/ethereum / r/solana

Adapt HN post — keep technical, drop the "thesis" framing.

---

## Discord / Telegram (channel intros)

> AgentMesh — open-source protocol stack for the autonomous AI agent
> economy. Six layers: identity, wallet, payment, discovery, marketplace,
> reputation. Composable, audited-soon, EVM + Solana, MIT.
>
> Repo: https://github.com/enesakb/agentmesh
> Demo: https://agentmesh-neon.vercel.app
> Spec: /docs/protocol-spec.md
> ADRs: /docs/decisions/
>
> Looking for: protocol feedback, integration partners, agent builders.

---

## Common questions (prep answers)

**Q: Why on-chain? Won't this be too slow / expensive?**
> Sub-cent per query on Polygon mainnet, ~$0.0001 per query on Base
> Sepolia. Solana port will hit micropayment thresholds (TPS, not cost).
> The protocol is chain-agnostic; pick the chain whose properties match
> your throughput needs.

**Q: Why not just use Stripe?**
> Two AI agents can't open Stripe accounts. The platform takes a cut on
> every cent. AgentMesh runs at the protocol level — no platform, no KYC,
> the fee is just the gas.

**Q: How is this different from ai16z / Virtuals / Olas?**
> Each does 1–2 layers brilliantly. None does all six. AgentMesh is the
> stack — read the comparison matrix on the landing page or in
> docs/research-notes.md.

**Q: Is this audited?**
> No. v0.1 is unaudited. 99 tests passing, 7 invariants asserted. Audit
> is on the roadmap between v0.2 and v1.0. Don't deploy to mainnet until
> after the audit.

**Q: Can I deploy my own instance?**
> Yes. MIT license. See DEPLOYING.md for the multi-chain deploy script.

**Q: Solana support?**
> Code-complete in /programs/agentmesh (Anchor). Toolchain on Linux/WSL.
> Devnet deploy on roadmap.

---

## Visual assets

OG image auto-generated by /apps/site/app/opengraph-image.tsx.
Twitter card uses the same image (twitter-image.tsx).

For Slack/Discord previews, the OG metadata is wired in
`apps/site/app/layout.tsx`.
