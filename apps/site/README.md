# @agentmesh/site

Landing page for AgentMesh. Next.js 16 (App Router, Turbopack) + Tailwind 4.

## Aesthetic

Terminal-brutalist editorial / phosphor-on-graphite.
Fraunces (display) + JetBrains Mono (everything else).

## Run

```powershell
pnpm --filter @agentmesh/site dev      # http://localhost:3030
pnpm --filter @agentmesh/site build    # production build
```

## Sections

| § | Component | Purpose |
|---|---|---|
| 1 | `Hero` | Wordmark + tagline + CTAs + session-info card |
| 2 | `StatsStrip` | 64 / 33 / 100% / 06 |
| 3 | `LayersSection` | Six layers as editorial table |
| 4 | `CodeShowcase` | SDK end-to-end in 18 lines |
| 5 | `SequenceDiagramSection` | ASCII sequence diagram |
| 6 | `Why` | 3 load-bearing decisions |
| 7 | `Footer` | Colophon + repo + docs |

## Deploy

Built for Vercel. From repo root:

```powershell
pnpm --filter @agentmesh/site build
# then vercel --prod or via Vercel dashboard
```

## TODO before launch

- swap GitHub URL placeholders (`your-handle`) in `Hero.tsx` and `Footer.tsx`
- point `/docs/*` footer links at the live GitHub URLs once repo is public
- (optional) hosted demo URL for the "live demo" button
