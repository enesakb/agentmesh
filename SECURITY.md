# Security policy

## Reporting

⚠️ **Do not file public issues for security vulnerabilities.**

Use one of:

- GitHub private advisory: https://github.com/enesakb/agentmesh/security/advisories/new
- Direct contact: open a discussion at https://github.com/enesakb/agentmesh/discussions and
  request a private channel — the maintainer will move the conversation
  off-list before details are shared.

## Scope

In scope:
- Smart contracts under `contracts/src/` (any deployment target)
- The `@agentmesh/sdk` and `@agentmesh/x402-server` / `x402-client` packages
- The hosted `apps/site` API routes (`/api/orders`, `/api/weather/*`)

Out of scope:
- Issues with the standard Foundry default Anvil mnemonic or any other
  publicly-documented test key
- Demo-only behaviour explicitly labelled as demo (e.g. the in-memory
  order book in `apps/site/lib/orders.ts` — it intentionally does not
  reflect the on-chain protocol)
- Vulnerabilities in upstream dependencies for which a fix is already
  released — please ping us if we haven't bumped yet

## Status

AgentMesh v0.1 is **unaudited**. Do not deploy to mainnet without an
independent security review. The current threat model is documented in
`docs/decisions/` (ADR-0001 through ADR-0006) and `docs/research-notes.md`.

A bug-bounty programme will open with the first audit pass (target: v0.2).
Until then, responsible disclosure is appreciated; rewards will be
recognition + early access to the audited release.

## Acknowledgements

Reporters who help us close real issues will be listed here once a fix
ships and the disclosure window expires.
