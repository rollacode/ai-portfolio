# AI Portfolio Agent — Monorepo

An interactive portfolio website where visitors chat with an AI agent that has **reactive tools** to control the UI. The agent can show projects, scroll timelines, highlight skills, open galleries — all mid-conversation with streaming.

Built with Next.js 15, Tailwind CSS, Turborepo, and any OpenAI-compatible LLM provider.

## Monorepo Structure

```
packages/
├── core/        Shared engine — components, hooks, lib, types (@ai-portfolio/core)
├── andrey/      Andrey Kovalev's portfolio — rollacode.org
└── anya/        Anna Ivanova's portfolio — ainyiva.org
```

## Setup

```bash
git clone https://github.com/rollacode/ai-portfolio.git
cd ai-portfolio
pnpm install
```

Copy env file for each site you want to run:

```bash
cp packages/andrey/.env.example packages/andrey/.env.local
cp packages/anya/.env.example packages/anya/.env.local
```

Edit `.env.local` with your API key:

```env
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.x.ai/v1
AI_MODEL=grok-3-mini-fast
```

Works with any OpenAI-compatible provider — xAI/Grok, OpenAI, Groq, Together AI, Ollama (local).

## Development

```bash
pnpm dev                                    # both sites (andrey :3000, anya :3001)
pnpm --filter @ai-portfolio/andrey dev      # just andrey
pnpm --filter @ai-portfolio/anya dev        # just anya
```

## Build & Test

```bash
pnpm build                                  # build all
pnpm test                                   # test all
pnpm --filter @ai-portfolio/andrey build    # build one
pnpm --filter @ai-portfolio/andrey test     # test one
```

## How it works

The agent has **22 tools** organized in four layers:

**Layer 1 — Panel tools** open/close UI panels:
`show_project`, `show_skills`, `show_contact`, `show_timeline`, `show_gallery`, `show_resume`, `show_tech_radar`, `show_quick_facts`, `show_recommendations`, `hide_panel`

**Layer 2 — Action tools** act inside open panels:
`scroll_timeline_to`, `highlight_period`, `focus_screenshot`, `highlight_skill`, `highlight_project_detail`, `compare_projects`, `highlight_recommendation`, `focus_radar_section`

**Layer 3 — Data tools** perform side effects:
`remember_visitor`, `generate_insight`

**Layer 4 — Side-effect tools** change the experience:
`set_theme`, `start_showtime`, `play_game`

The agent interleaves tool calls with text naturally — it opens a timeline, scrolls to a company, highlights the period, then narrates the story. All streamed in real-time via SSE.

## Fork & make it yours

Each site has its own `portfolio/` directory with JSON data files:

| File | What it contains |
|------|-----------------|
| `config.json` | Name, bio, social links, theme colors, agent personality, suggested questions |
| `projects.json` | Projects with slugs, descriptions, tech stacks, links, screenshots, writeups |
| `skills.json` | Skills grouped by category (primary, strong, AI, working knowledge, hobby) |
| `experience.json` | Career timeline entries with company, role, years, description |
| `recommendations.json` | LinkedIn recommendations with author info and project references |

To create a new portfolio site: copy `packages/andrey/` as a template, replace `portfolio/*.json` with your data, update `prompts/system.ts` for your personality.

## Vercel Deployment

Each site deploys as a separate Vercel project from the same repo:
- **Root Directory**: `packages/andrey` or `packages/anya`
- Vercel auto-detects Turborepo and pnpm

## Stack

- **Turborepo** — monorepo orchestration
- **pnpm** — workspace package manager
- **Next.js 15** with App Router and Turbopack
- **Tailwind CSS** — ultra-minimalist black & white design
- **Framer Motion** — panel and layout animations
- **react-markdown** — renders agent responses
- **IndexedDB** — persists chat messages and panel state across refreshes
- **SSE streaming** — real-time agent responses with interleaved tool calls

## License

MIT
