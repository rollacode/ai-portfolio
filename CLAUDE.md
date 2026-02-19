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

### Directory Structure

```
app/
  layout.tsx              # Root layout, dark mode init script, metadata from config.json
  page.tsx                # Single page — renders Chat + Toolbar
  globals.css             # Tailwind imports + global styles
  api/
    chat/route.ts         # POST — SSE proxy to AI provider
    visitor/route.ts      # POST (save visitor, no auth) + GET (read all, ADMIN_TOKEN)

components/
  Chat.tsx                # Main orchestrator — messages, streaming, layout modes, action queue
  ChatInput.tsx           # Input field with suggested chips
  ChatMessage.tsx         # Single message bubble (renders markdown via react-markdown)
  ContentPanel.tsx        # Panel container — routes PanelState to child components
  SuggestedChips.tsx      # Quick-action suggestion chips
  ToolCallBadge.tsx       # Visual indicator for tool calls in messages
  TypingIndicator.tsx     # Typing animation (not bouncing dots)
  Toolbar.tsx             # Top-right toolbar (theme toggle, clear chat)
  ThemeToggle.tsx         # Dark/light mode toggle
  ProjectCard.tsx         # Single project detail card
  ProjectsTimeline.tsx    # All projects as scrollable vertical timeline
  SkillsGrid.tsx          # Skills grid with category filter + highlight
  Timeline.tsx            # Career timeline (work history)
  ContactCard.tsx         # Contact info panel
  Gallery.tsx             # Fullscreen screenshot gallery (renders as modal, not in panel)
  ResumePanel.tsx         # Resume/CV with PDF + Markdown download
  TechRadar.tsx           # Interactive concentric ring skill visualization
  QuickFacts.tsx          # Animated portfolio stats
  Recommendations.tsx     # LinkedIn recommendations panel
  SnakeGame.tsx           # Easter egg: Snake game
  Game2048.tsx            # Easter egg: 2048 game

lib/
  stream-parser.ts        # AsyncGenerator that parses SSE into StreamEvent (text | tool_call | done | error)
  tool-handler.ts         # Maps tool name + args → { panelState, action } — pure logic, no React
  tools.ts                # 22 tool definitions in OpenAI function calling format + context enrichment
  action-queue.ts         # Buffers Layer 2 actions until panel animation completes (150ms stagger)
  chat-store.ts           # IndexedDB persistence (messages + panelState) — DB: 'portfolio-agent'
  system-prompt.ts        # Loads ALL portfolio JSON → formats into system prompt text

hooks/
  useMediaQuery.ts        # Responsive breakpoint hook (768px for desktop/mobile)

portfolio/                # Single source of truth for ALL content (JSON)
  config.json             # Name, bio, location, social links, languages, education, agent personality
  experience.json         # Work history entries (company, role, period, highlights, stack)
  skills.json             # Skills by category: primary, strong, ai, working
  projects.json           # Projects with slug, stack, highlights, writeups, skillIds, links
  recommendations.json    # LinkedIn recommendations (name, title, relation, text)

public/
  screenshots/            # Project screenshots referenced by Gallery component

data/
  visitors.json           # Visitor data saved by remember_visitor tool (filesystem, not DB)

tests/
  portfolio-data.test.ts  # (28) Data integrity, cross-refs, schema validation
  api-chat.test.ts        # (5) Chat endpoint tests
  api-visitor.test.ts     # (9) Visitor endpoint tests
```

### Tool System (4 Layers)

**Layer 1 — Panel tools** (open/close UI panels):
`show_project`, `show_projects`, `show_skills`, `show_contact`, `show_timeline`, `show_gallery`, `show_resume`, `show_tech_radar`, `show_quick_facts`, `show_recommendations`, `hide_panel`, `play_game`

**Layer 2 — Action tools** (interact within open panels, require panel to be open):
`scroll_timeline_to`, `highlight_period`, `focus_screenshot`, `highlight_skill`, `highlight_project_detail`, `compare_projects`, `scroll_to_project`, `highlight_project`, `highlight_recommendation`, `focus_radar_section`

**Layer 3 — Data tools** (side effects, no UI):
`remember_visitor` — fire-and-forget POST to /api/visitor with visitorId from sessionStorage

**Layer 4 — Side-effect tools** (modify UI outside panels):
`set_theme` — dark/light/toggle, modifies DOM class directly

### Panel Types (13 total)

| Type | Component | Tool |
|---|---|---|
| `project` | ProjectCard | `show_project(slug)` |
| `projects` | ProjectsTimeline | `show_projects(filter?, skillId?)` |
| `skills` | SkillsGrid | `show_skills(category?)` |
| `contact` | ContactCard | `show_contact()` |
| `timeline` | Timeline | `show_timeline()` |
| `gallery` | Gallery (fullscreen modal) | `show_gallery(slug)` |
| `comparison` | 2x ProjectCard | `compare_projects(slug1, slug2)` |
| `resume` | ResumePanel | `show_resume()` |
| `tech-radar` | TechRadar | `show_tech_radar()` |
| `quick-facts` | QuickFacts | `show_quick_facts()` |
| `recommendations` | Recommendations | `show_recommendations()` |
| `game` | SnakeGame / Game2048 | `play_game(game)` |

### Layout Modes

Three states controlled by `Chat.tsx`:
- **welcome** — no messages, centered minimal landing
- **chat** — messages exist, centered chat column (no panel)
- **split** — panel open on left (slides from left on desktop, bottom sheet on mobile), chat pushed right

### Action Queue

`ActionQueue` in `lib/action-queue.ts` solves the timing problem: Layer 2 actions (scroll, highlight) require the target panel to be open and animated in. The queue buffers actions and flushes them with 150ms stagger once `setPanelReady(true)` is called by the panel's `onAnimationComplete`.

### Portfolio Data (Single Source of Truth)

All personal/portfolio content lives in `portfolio/*.json`. Zero hardcoded personal info in components or lib code. The system prompt (`lib/system-prompt.ts`) loads ALL JSON files at request time and formats them into readable text for the AI.

Tool definitions are enriched at runtime via `getToolsWithContext()` which injects valid slugs, company names, skill names, and recommendation authors as enum values into tool parameter schemas.

## Design System

- Ultra-minimalist, black & white
- Accent: lime-500 (`#84cc16`) — used sparingly. **NO BLUE.**
- Page bg: `#fafafa` (light) / `#0a0a0a` (dark) — NOT pure white/black
- Panel bg: `bg-white dark:bg-black`
- Cards: `bg-gray-50/70 dark:bg-white/[0.05]`
- Input: `bg-neutral-50/80 dark:bg-neutral-950/80`
- Dark mode: class-based (`darkMode: "class"` in tailwind config), toggled via localStorage
- Panel animations: spring (`damping: 25, stiffness: 200`)
- Desktop panel: slides from left, width `calc(100vw - 500px)`, chat stays in 500px right column
- Mobile: full-screen bottom sheet with backdrop overlay
- iOS-style scrollbars, no bouncing dots typing indicator

## Agent System

### System Prompt

Located in `lib/system-prompt.ts`. Built dynamically at each request via `buildSystemPrompt()`:
1. Loads all 5 portfolio JSON files
2. Formats each into readable sections (About, Strengths, Experience, Skills, Projects, Recommendations)
3. Wraps with personality instructions, tool usage rules, social proof strategy, capability hints

Key agent behaviors:
- Responds in the user's language (Russian → Russian, English → English)
- MUST use tools on every response (except pure small talk)
- Social proof: references LinkedIn recommendations when contextually relevant
- Capability hints: subtly reveals features every 3-4 exchanges
- Visitor tracking: calls `remember_visitor()` every time visitor shares ANY personal info
- Asks for contact info naturally mid-conversation

Personality and greeting are configurable via `portfolio/config.json` → `agent.personality` and `agent.greeting`.

### Tools (22 total)

**Panel (12):**
- `show_project(slug)` — open single project card
- `show_projects(filter?, skillId?)` — projects timeline, filterable by category or skill
- `show_skills(category?)` — skills grid with optional filter (primary/strong/ai/working)
- `show_contact()` — contact info (email, GitHub, LinkedIn)
- `show_timeline()` — career history
- `show_gallery(slug)` — fullscreen screenshot gallery
- `show_resume()` — CV with PDF/MD download
- `show_tech_radar()` — concentric ring skill visualization
- `show_quick_facts()` — animated stats cards
- `show_recommendations()` — LinkedIn recommendations
- `hide_panel()` — close current panel
- `play_game(game)` — snake or 2048 easter egg

**Action (10):**
- `scroll_timeline_to(company)` — scroll career timeline to company
- `highlight_period(company, years?)` — pulse/glow a period on timeline
- `focus_screenshot(slug, index)` — zoom into specific screenshot
- `highlight_skill(name)` — pulse a skill in skills grid
- `highlight_project_detail(slug, field)` — highlight section of project card (stack/highlights/description/links)
- `compare_projects(slug1, slug2)` — side-by-side project comparison
- `scroll_to_project(slug)` — scroll projects timeline to project
- `highlight_project(slug)` — pulse a project in projects timeline
- `highlight_recommendation(name)` — highlight specific recommendation
- `focus_radar_section(category)` — zoom into a tech radar ring

**Data (1):**
- `remember_visitor(name?, company?, role?, interest?, email?, telegram?, phone?, linkedin?, notes?)` — saves visitor info, merges by visitorId

**Side-effect (1):**
- `set_theme(theme)` — dark/light/toggle

## API Endpoints

### POST /api/chat

Streams SSE response from AI provider. Sends system prompt + context-enriched tools + message history. Pipes the raw SSE stream straight through to the client. Temperature: 0.7.

### POST /api/visitor

Saves visitor info. No auth. Merges by `visitorId` (UUID from sessionStorage). Falls back to 30-min timestamp-based merge. Fields: name, company, role, interest, email, telegram, phone, linkedin, notes. Empty fields are filtered out. Notes field appends (deduped), other fields overwrite.

### GET /api/visitor

Returns all visitors as JSON. Protected by `ADMIN_TOKEN` via Bearer header or `?token=` query param.

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

## Agent Delegation

Custom agents in `.claude/agents/`:

- **ui-architect** — Components, panels, animations, Tailwind, Framer Motion, responsive layout
- **prompt-engineer** — System prompt, tool definitions, agent behavior tuning, personality
- **tester** — Writing and fixing Vitest tests, data integrity checks
- **data-curator** — Portfolio JSON data, content accuracy, cross-references between files
