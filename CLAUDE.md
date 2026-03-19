# AI Portfolio — Monorepo

> Turborepo monorepo for AI-powered portfolio websites with reactive agent UI

## Structure

```
packages/
├── core/          @ai-portfolio/core — shared engine (components, hooks, lib, types)
├── andrey/        @ai-portfolio/andrey — rollacode.org (Andrey Kovalev)
└── anya/          @ai-portfolio/anya — ainyiva.org (Anna Ivanova)
```

## Quick Start

```bash
pnpm install
pnpm dev              # starts both sites (andrey :3000, anya :3001)
pnpm build            # builds all packages
pnpm test             # runs all tests
pnpm --filter @ai-portfolio/andrey dev   # just andrey
pnpm --filter @ai-portfolio/anya dev     # just anya
```

## Architecture

### Core Package (`packages/core/`)
Shared TypeScript library — NOT a Next.js app. Contains:
- **components/** — all React components (chat, panels, games, ui)
- **hooks/** — custom hooks (chat stream, persistence, layout, etc.)
- **lib/** — utilities (tools, stream-parser, action-queue, rate-limit, etc.)
- **prompts/** — system prompt templates
- **context/** — `PortfolioDataProvider` + `usePortfolioData()` hook
- **types/** — `PortfolioData`, `Project`, `Skill`, `Experience`, etc.

### Site Packages (`packages/andrey/`, `packages/anya/`)
Each is a Next.js 15 app with:
- **portfolio/*.json** — site-specific data (config, projects, skills, experience, recommendations)
- **public/screenshots/** — project screenshots
- **app/** — pages + thin API route wrappers
- **app/providers.tsx** — wraps app in `PortfolioDataProvider` with site's JSON data
- **.env.local** — site-specific env vars

### Data Flow
Components use `usePortfolioData()` context hook — no direct JSON imports in core.
API routes still use `@/portfolio/` imports (server-side, per-site).
System prompt loaded via `process.cwd()/portfolio/` at request time.

## Design System
- Andrey: accent **lime-500 (#84cc16)**
- Anya: accent **fuchsia-400 (#e879f9)**
- Shared: ultra-minimalist black & white, iOS scrollbars, spring animations

## Testing
```bash
pnpm test                                    # all
pnpm --filter @ai-portfolio/andrey test      # andrey only (210 tests)
pnpm --filter @ai-portfolio/anya test        # anya only
```
