# Glossary

Terminology used across AgentMesh docs and code. Skim once, then refer back
when something feels jargon-y.

## Protocol terms

**Agent** — Any party that holds an `AgentAccount`. Usually a piece of
software (LLM-driven process), occasionally a human running the SDK.

**Agent account** — The smart account that represents an agent on-chain.
ERC-4337 v0.7 + ERC-7579 modular. Owns the agent's funds, runs hooks before
each execute.

**Owner / owner EOA** — The keypair that controls the agent account. NOT the
agent's identity; the agent's identity is its on-chain address. Owners can
be rotated via the recovery module without changing the agent's identity.

**Capability** — A string that describes what the agent can do, e.g.
`data.weather`, `compute.image`. Indexed on-chain by `keccak256(string)`.

**Capability hash** — `bytes32` that lives on-chain. The string lives only
off-chain (in metadata, in the SDK's well-known list, in the integration
guide).

**Listing** — A `(provider, serviceURI, priceWei)` tuple in
`ServiceMarketplace`. Active until the provider deactivates it.

**Order** — A `(consumer, provider, listing, priceWei, status, timeoutAt)`
tuple created when a consumer pays into escrow.

**Order status** — `None`, `Created`, `Completed`, or `Refunded`. State
transitions are 1-way: Created → Completed (provider) or Created →
Refunded (consumer after timeout).

**Escrow** — ETH held by the `ServiceMarketplace` contract on behalf of an
order. Released only on `completeOrder` or `refundOrder`.

**Reputation** — `Stats` struct in `ReputationRegistry`: success count,
failure count, total volume, unique counterparties, first/last seen.
Append-only, updated only by authorized loggers (the marketplace).

**Score** — A single uint 0..10000 derived from reputation stats:
`(successRate × √min(N, 100)) / 10`.

**x402** — Coinbase's standard for inline HTTP payment, overloading
`HTTP 402 Payment Required`. AgentMesh adopts the spec and binds it to
marketplace orders.

**OrderId / token** — In the on-chain protocol, a uint that increments
monotonically. In the hosted demo at `agentmesh-neon.vercel.app`, an
HMAC-signed string with `(timestamp, nonce, listingId, priceWei, expiresAt,
sig)` shape — same wire-format role, different verification mechanism.

## Standards we touch

**ERC-4337** — Ethereum's account abstraction standard. Smart accounts that
can validate UserOps via a bundler. We implement v0.7 (`PackedUserOperation`).

**ERC-7579** — Modular smart-account standard. Defines module type IDs
(1=validator, 2=executor, 3=fallback, 4=hook). We implement minimal hook
iteration on `execute`.

**ERC-8004** — Draft "agent identity" EIP. Conceptually compatible with our
`AgentRegistry`; not yet a final standard.

**EIP-1167** — Minimal proxy standard. `AgentAccountFactory` uses
`Clones.cloneDeterministic` to deploy CREATE2 clones for each agent.

**HTTP 402** — Reserved status code for payment. x402 (Coinbase) is the
first widely-adopted protocol that actually uses it.

**EIP-3009** — `transferWithAuthorization` for ERC-20 (signed transfers).
The original Coinbase x402 reference uses USDC EIP-3009 transfers as
payment proof. We don't (we use orderIds), but the SDK is structured so
this can be added later.

## EVM specifics

**EntryPoint** — The canonical ERC-4337 v0.7 contract at
`0x0000000071727De22E5E9d8BAf0edAc6f37da032` on every EVM chain. We don't
deploy our own.

**Bundler** — A service that takes UserOps from the mempool, simulates them,
and submits them to the EntryPoint. Pimlico is the bundler we test with.

**Paymaster** — A contract that pays for gas on behalf of users. Optional;
we don't use one in v0.1.

**CREATE2** — Deterministic contract deploy: address = function of
`(deployer, salt, init code hash)`. Lets us know an agent's address before
deploying.

## Solana specifics

**PDA (Program Derived Address)** — Account whose address is derived from
seeds + program ID, has no private key. We use PDAs for every state struct
(agents, listings, orders, reputations).

**Anchor** — Solana's smart-contract framework (Rust + procedural macros).
We use it because the alternative (raw bpf programs) is too low-level.

**Devnet** — Solana's free testnet. Has a built-in `solana airdrop` command
that bypasses faucet gating.

## Project terms

**v0.1** — First public release. Six layers, MVP, unaudited. Demo runs
end-to-end on local anvil.

**Provider** — In a transaction, the agent serving a service.

**Consumer** — In a transaction, the agent paying for a service.

**Demo-alpha / demo-beta** — Two reference agents in `apps/`, one provider,
one consumer. The full end-to-end demo is them talking to each other
through the protocol.

**External agent** — Anything outside the AgentMesh monorepo that uses only
the public HTTP API or the SDK to interact. `apps/external-agent` is
purposefully one — same code a third-party developer would write.

**Stress test** — `apps/external-agent/src/{sequential,parallel,adversarial,swarm}.ts`,
each driving the protocol under a different load profile.

**Foundry test** — `contracts/test/*.t.sol`, run with `forge test`. 66 of
them as of v0.1.

**Vitest test** — `packages/*/src/*.test.ts`, run with `pnpm -r test`.
33 of them as of v0.1.

**ADR** — Architecture Decision Record. One markdown file per
load-bearing decision, in `docs/decisions/`. Explains the choice + the
alternatives + the trade-off.

**Live demo** — `https://agentmesh-neon.vercel.app/#try`. A real x402
endpoint deployed as Vercel Edge Functions; the protocol flow works end
to end in the browser without any local setup.

## When in doubt

If a term feels off:
1. Search the codebase: `grep -r 'term' contracts/src packages apps`
2. Check `docs/protocol-spec.md` for wire-level definitions
3. Check `docs/decisions/` to see if there's an ADR explaining a choice
4. Open a GitHub discussion with `[glossary]:` prefix and we'll add the
   answer here.
