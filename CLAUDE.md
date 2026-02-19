# AI Portfolio Agent

> Interactive portfolio website with a reactive AI agent that controls the UI via function calling

## Tech Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, Framer Motion 12
**AI:** Any OpenAI-compatible provider (xAI/Grok default), streaming SSE, function calling (22 tools)
**State:** IndexedDB (chat persistence), sessionStorage (visitor ID)
**Testing:** Vitest 4
**Dev:** Turbopack

## Quick Start

```bash
npm install
npm run dev          # starts on localhost:3000 with Turbopack
npm test             # vitest run (42 tests)
npm run test:watch   # vitest in watch mode
npm run build        # production build
npm run lint         # next lint
```

## Environment Variables

Required in `.env` (see `.env.example`):

| Variable | Description | Default |
|---|---|---|
| `AI_API_KEY` | API key for AI provider (fallback: `XAI_API_KEY`) | — |
| `AI_BASE_URL` | Provider base URL (fallback: `XAI_BASE_URL`) | `https://api.x.ai/v1` |
| `AI_MODEL` | Model name (fallback: `XAI_MODEL`) | `grok-3-mini-fast` |
| `ADMIN_TOKEN` | Token for GET /api/visitor (visitor data access) | — |

Supported providers: xAI/Grok, OpenAI, Groq, Together AI, local Ollama. All use the same OpenAI-compatible `/chat/completions` endpoint.

## Architecture Overview

### Data Flow

```
User message → POST /api/chat (SSE stream) → AI responds with text + tool calls
→ stream-parser.ts parses SSE chunks → tool-handler.ts maps to PanelState/PanelAction
→ action-queue.ts buffers until panel animation completes → ContentPanel dispatches to child components
```

### Key Concepts

- **Portfolio data** lives in `portfolio/*.json` — single source of truth, zero hardcoded content in components
- **Tool system** has 4 layers: Panel tools (open UI), Action tools (interact within panels), Data tools (side effects), Side-effect tools (theme)
- **Action queue** buffers Layer 2 actions until panel animation completes (150ms stagger)
- **System prompt** in `lib/system-prompt.ts` loads ALL portfolio JSON at request time
- **Tool enrichment**: `getToolsWithContext()` injects valid slugs/names as enum values into tool schemas

### Layout Modes

- **welcome** — no messages, centered landing
- **chat** — messages exist, centered chat column
- **split** — panel left + chat right (bottom sheet on mobile)

## Design System

- Ultra-minimalist, black & white. Accent: **lime-500 (#84cc16)**. **NO BLUE.**
- Page bg: `#fafafa` / `#0a0a0a` (NOT pure white/black)
- Panel bg: `bg-white dark:bg-black`
- Cards: `bg-gray-50/70 dark:bg-white/[0.05]`
- iOS-style scrollbars, spring animations (`damping: 25, stiffness: 200`)

## Agent Delegation

Custom agents in `.claude/agents/`:

- **ui-architect** — Components, panels, animations, Tailwind, Framer Motion, responsive layout
- **prompt-engineer** — System prompt, tool definitions, agent behavior tuning, personality
- **tester** — Writing and fixing Vitest tests, data integrity checks
- **data-curator** — Portfolio JSON data, content accuracy, cross-references between files

## Testing

42 tests across 3 files:

| File | Count | What it tests |
|---|---|---|
| `tests/portfolio-data.test.ts` | 28 | Data integrity, cross-references between projects/skills/experience, schema validation |
| `tests/api-chat.test.ts` | 5 | Chat endpoint: missing key, request format, tool injection |
| `tests/api-visitor.test.ts` | 9 | Visitor CRUD: save, merge by ID, merge by timestamp, auth |

Run: `npm test` or `npm run test:watch`

## Known Limitations

- Visitor storage uses filesystem (`data/visitors.json`) — won't persist on serverless (Vercel). The `data/` directory is not auto-created on fresh deploy.
- No rate limiting on any API endpoint.
- Chat sends full message history every request (no sliding window / token budget).
- `getToolsWithContext()` runs `structuredClone` on all 22 tools per request — negligible but noted.
- Gallery component renders as fullscreen modal outside the panel container (special case in ContentPanel).
