# ADR-0002 — Minimal ERC-7579 module surface

Date: 2026-05-08

## Context

ERC-7579 specifies a rich module-handling surface (selector-routed fallback,
typed validators/executors/hooks, init/deinit data, multi-account modules).
A faithful implementation would dominate the contract size budget for the
MVP and obscure the actual demo.

## Options

1. Full ERC-7579 conformance via a third-party kernel (e.g. ZeroDev Kernel).
   Heavy, opinionated, version churn.
2. Reimplement ERC-7579 from scratch end-to-end. Multi-week effort.
3. **Implement only the slice the demo needs**: install/uninstall modules,
   pre-execute hook iteration, ERC-4337 validateUserOp. Validators,
   executors, fallbacks have *interfaces reserved* but no logic in MVP.

## Decision

Option 3.

## Consequences

- AgentAccount fits in a few hundred lines, easy to audit.
- The hook list is a plain `address[]` capped at `MAX_HOOKS = 8`. Future
  versions can replace with a richer ERC-7579 hook router.
- Validator-as-module (custom auth) is unavailable until a future ADR
  expands the surface. Acceptable: in MVP, owner-ECDSA is the only auth.
- Modules built against a strict ERC-7579 reference may not link directly;
  porting is required if we ever support them.
