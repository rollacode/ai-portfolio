# AI Portfolio Agent — Implementation Plan

## Vision

An **open-source AI portfolio template** — not a static site, but a **reactive AI agent** that knows everything about the person, has tools to interact with the UI, and shows content dynamically. Fork it, drop your data, deploy — done.

The core idea: a chat with an AI agent at the center. The agent has **tools** — it can show projects, display skills, open galleries, show timelines. It decides when and what to show based on the conversation. The frontend reacts to tool calls and renders rich UI. It's not a chatbot with hardcoded tokens — it's a real agent with capabilities.

**Two audiences:**
1. **Visitors** — talk to the agent, explore the portfolio interactively
2. **Developers** — fork the repo, replace content files, add custom tools, deploy their own

---

## Core concept: Reactive Agent with Tools

### Why tools, not tokens

Previous approach: agent writes `[[show:project:slug]]` in text, frontend parses it.
**Problems:** fragile regex parsing, model doesn't "know" its capabilities, can't compose actions, hard to extend.

**New approach: function calling (tool use)**

The agent receives a list of tools with descriptions. The xAI API (OpenAI-compatible) returns structured `tool_calls` in the response. The frontend interprets tool calls as UI actions.

```
User message → API route → Grok (with tools defined)
                                ↓
                    Response: { content: "text...", tool_calls: [...] }
                                ↓
              Frontend: render text + execute UI actions from tool_calls
```

The model **decides** when to call tools. It knows what it can do. It can call multiple tools in one response. It can explain what it's showing and why.

### Tool architecture — two layers

Tools are split into two layers:

**Layer 1: Panel tools** — open/close panels
**Layer 2: Action tools** — act INSIDE open panels (scroll, highlight, zoom, focus)

The agent doesn't just show a panel and stop. It **narrates and acts simultaneously** — talks about career while scrolling the timeline, highlights the relevant period, zooms into a screenshot while describing a feature. The UI becomes a live presentation driven by the agent.

### Tool definitions

```typescript
// lib/tools.ts

// ── Layer 1: Panel tools (open/close views) ──

show_project(slug: string)
  // Open project card in side panel
  // Screenshots, tech stack, description, links

show_skills(category?: "all" | "primary" | "strong" | "ai" | "working")
  // Show skills grid, optionally filtered

show_contact()
  // Show contact info panel

show_timeline()
  // Open career timeline panel

show_gallery(slug: string)
  // Open fullscreen screenshot gallery for a project

hide_panel()
  // Close whatever panel is open, return to full chat

// ── Layer 2: Action tools (act inside panels) ──

scroll_timeline_to(company: string)
  // Smooth-scroll the timeline to a specific company entry
  // e.g. scroll_timeline_to("REKAP") → timeline glides to REKAP section

highlight_period(company: string, years?: string)
  // Pulse/glow a specific period on the timeline
  // e.g. highlight_period("QuantumSoft", "2012-2023") → that block lights up

focus_screenshot(slug: string, index: number)
  // Zoom into a specific screenshot in an open project card or gallery
  // e.g. focus_screenshot("minnow", 2) → third screenshot zooms in

highlight_skill(name: string)
  // Pulse a specific skill in the skills grid
  // e.g. highlight_skill("Swift") → Swift badge glows

highlight_project_detail(slug: string, field: "stack" | "highlights" | "description" | "links")
  // Draw attention to a specific section of an open project card
  // e.g. highlight_project_detail("trax-retail", "stack") → tech stack section pulses

compare_projects(slug1: string, slug2: string)
  // Show two project cards side by side for comparison
  // e.g. compare_projects("binaura", "thinkup") → split panel view
```

### Example: agent narrates career

User: "Tell me about his career path"

Agent response (streamed):

```
1. Agent calls show_timeline()
   → Panel slides in from left with full career timeline

2. Agent starts typing: "Andrey started his career at Secret Stronghold in 2012,
   co-founding a game studio..."
   → Simultaneously calls scroll_timeline_to("Secret Stronghold")
   → Timeline smooth-scrolls to the bottom (earliest entry)
   → Calls highlight_period("Secret Stronghold", "2012")
   → That period pulses with accent color

3. Agent continues: "...then joined QuantumSoft where he spent 11 years
   building 7 products from scratch..."
   → Calls scroll_timeline_to("QuantumSoft")
   → Timeline scrolls up to QuantumSoft
   → Calls highlight_period("QuantumSoft", "2012-2023")
   → Large block highlights

4. Agent continues: "...most recently he's been at REKAP, building AI voice agents
   and platform architecture."
   → Calls scroll_timeline_to("REKAP")
   → Timeline scrolls to top (current)
   → Calls highlight_period("REKAP", "2023-present")
```

The visitor sees: text appearing in chat on the right, timeline animating on the left in sync. Like a guided tour. **That's the wow factor.**

### How it flows

1. User sends message
2. API route sends messages + tools + system prompt to Grok
3. Grok responds with text content AND `tool_calls` (can be multiple, interleaved with text)
4. API route streams everything to client as SSE
5. Frontend parses stream: text → chat, tool_calls → UI actions
6. Layer 1 tools → open/close panels with spring animation
7. Layer 2 tools → act inside panels (scroll, highlight, zoom) with micro-animations
8. All happens **mid-stream** — agent is still typing while UI is reacting

### Streaming with tool calls

The xAI API (OpenAI-compatible) streams tool calls as part of the response:

```
data: {"choices":[{"delta":{"content":"Let me walk you through "}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"show_timeline","arguments":"{}"}}]}}]}
data: {"choices":[{"delta":{"content":"his career. He started at Secret Stronghold..."}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":1,"function":{"name":"scroll_timeline_to","arguments":"{\"company\":\"Secret Stronghold\"}"}}]}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":2,"function":{"name":"highlight_period","arguments":"{\"company\":\"Secret Stronghold\",\"years\":\"2012\"}"}}]}}]}
data: {"choices":[{"delta":{"content":"...then moved to QuantumSoft where he spent 11 years..."}}]}
data: {"choices":[{"delta":{"tool_calls":[{"index":3,"function":{"name":"scroll_timeline_to","arguments":"{\"company\":\"QuantumSoft\"}"}}]}}]}
data: [DONE]
```

Frontend handles each chunk instantly — text goes to chat, tool calls trigger animations. No waiting for the full response.

### Important: parallel tool calls

The model can call multiple tools at once (e.g. `show_timeline` + `scroll_timeline_to` in the same response). The frontend queues actions that depend on panel state (can't scroll a timeline that isn't open yet) with a short delay, ensuring smooth sequencing.

Action queue logic:
```
tool_call: show_timeline()     → open panel (300ms animation)
tool_call: scroll_timeline_to("REKAP")  → queued, executes after panel open
tool_call: highlight_period("REKAP")    → queued, executes after scroll
```

Each action has a small stagger (100-200ms) so animations don't collide.

---

## Architecture

### Stack
- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS 3.4** (dark mode via class strategy)
- **Framer Motion** (layout animations, panel transitions, micro-interactions)
- **Grok / xAI API** (`grok-3-mini-fast`, streaming, OpenAI-compatible) — cheap and fast, supports function calling
- **react-markdown** (render agent responses with rich formatting)
- No database. No auth. No backend beyond one API route.

### Data flow
```
portfolio/*.md + data/config.json + data/projects.json
        ↓
  lib/system-prompt.ts (builds system prompt from content files)
  lib/tools.ts (defines agent tools, auto-generated from data)
        ↓
  app/api/chat/route.ts (sends messages + tools to Grok, streams response)
        ↓
  components/Chat.tsx (parses SSE stream → text + tool_calls → state)
        ↓
  ContentPanel.tsx ← ProjectCard / SkillsGrid / ContactCard / Timeline / Gallery
```

### Key difference from before
- `lib/panel-parser.ts` → **DELETED** (no more regex token parsing)
- `lib/tools.ts` → **NEW** (tool definitions for function calling)
- API route sends `tools` array to the model
- Frontend handles structured `tool_calls`, not text tokens

---

## UX / Layout

### Default state — chat centered
```
┌──────────────────────────────────────────────┐
│  Portfolio Agent                    [☀/☾]    │
├──────────────────────────────────────────────┤
│                                              │
│          Hey! Ask me anything about          │
│             {Person Name}                    │
│                                              │
│    [Projects] [Skills] [Experience] [...]    │
│                                              │
│    ┌──────────────────────────────┐  [→]     │
│    │ Type your question...        │          │
│    └──────────────────────────────┘          │
└──────────────────────────────────────────────┘
```

### Agent calls a tool — panel slides in
Chat slides right, content panel slides in from left (spring animation):
```
┌──────────────────────────────────────────────┐
│  Portfolio Agent                    [☀/☾]    │
├───────────────┬──────────────────────────────┤
│  Project X    │  Agent: Here's Project X —   │
│               │  a CV pipeline for shelf     │
│  [screenshot] │  recognition. I've opened    │
│  [screenshot] │  the details on the left.    │
│               │                              │
│  Stack:       │  You: What stack was used?   │
│  Swift, OpenCV│                              │
│  Python       │  Agent: Swift for iOS, ...   │
│               │                              │
│  [✕ close]    │  [Type question...    ] [→]  │
└───────────────┴──────────────────────────────┘
```

### Tool call indicator in chat
When the agent calls a tool, the chat shows a subtle inline indicator:

```
Agent: Let me walk you through his career.
       ┌─ ⚡ show_timeline() ─────────────────┐
       └──────────────────────────────────────┘
       He started at Secret Stronghold in 2012...
       ┌─ ⚡ scroll_timeline_to("Secret Stronghold") ─┐
       └───────────────────────────────────────────────┘
       ┌─ ⚡ highlight_period("Secret Stronghold") ────┐
       └───────────────────────────────────────────────┘
       ...then joined QuantumSoft for 11 years...
       ┌─ ⚡ scroll_timeline_to("QuantumSoft") ────────┐
       └───────────────────────────────────────────────┘
```

Visitors see tool calls happening in real-time as the agent talks. It's clear this is an agent **acting**, not just a chatbot typing. The tools appear inline, subtle but visible — like watching an AI think and do at the same time.

Panel closes → chat animates back to center. Responsive — on mobile, panel goes full-screen overlay.

---

## Design

### Dark theme (default)
- Background: `#0a0a0a`
- Surface: `#111827`
- Accent: `#0ea5e9` (sky-500)
- Text: `#e2e8f0`

### Light theme
- Background: `#fafafa`
- Surface: `#ffffff`
- Accent: `#0ea5e9`
- Text: `#1e293b`

### Visual effects (the "wow" factor)
- Subtle ambient glow behind the chat area (blurred gradient orbs)
- Spring-based panel slide animation (framer-motion)
- Message fade-in with stagger
- Typing indicator (animated dots)
- **Tool call indicator** — subtle animated badge when agent uses a tool
- Screenshot hover zoom (scale + shadow)
- Smooth theme toggle transition
- Suggested question chips with hover lift
- Gradient text on the person's name in welcome screen

---

## File structure
```
├── app/
│   ├── layout.tsx              # Root layout, dark mode init script
│   ├── page.tsx                # Home — header + Chat component
│   ├── globals.css             # CSS variables, Tailwind directives, theme colors
│   └── api/
│       └── chat/
│           └── route.ts        # POST — sends messages + tools to Grok, streams response
│
├── components/
│   ├── Chat.tsx                # Main orchestrator (messages, streaming, tool_calls → panel state)
│   ├── ChatInput.tsx           # Input field + send button
│   ├── ChatMessage.tsx         # Message bubble (markdown + inline tool call indicators)
│   ├── ContentPanel.tsx        # Animated left panel container
│   ├── ProjectCard.tsx         # Project detail view (screenshots, stack, links)
│   ├── SkillsGrid.tsx          # Skills display with categories
│   ├── ContactCard.tsx         # Contact info display
│   ├── Timeline.tsx            # Career timeline (experience)
│   ├── Gallery.tsx             # Fullscreen screenshot gallery
│   ├── ToolCallBadge.tsx       # Inline tool call indicator in chat
│   ├── SuggestedChips.tsx      # Suggested question buttons
│   ├── ThemeToggle.tsx         # Dark/light toggle
│   └── TypingIndicator.tsx     # Animated loading dots
│
├── lib/
│   ├── tools.ts                # Tool definitions for the agent (JSON schemas)
│   ├── tool-handler.ts         # Maps tool_calls to UI actions
│   ├── system-prompt.ts        # Loads portfolio/*.md, builds system prompt
│   └── stream-parser.ts        # Parses SSE stream (text + tool_calls)
│
├── data/                       # ← USER EDITS THESE
│   ├── config.json             # Name, title, suggested questions, social links, theme
│   └── projects.json           # Project metadata (slug, name, stack, screenshots)
│
├── portfolio/                  # ← USER EDITS THESE (markdown content)
│   ├── about.md                # Bio, location, languages, education
│   ├── experience.md           # Work history
│   ├── skills.md               # Technical skills
│   ├── meta.md                 # Unique selling points / "why hire me"
│   └── projects/
│       ├── project-a.md
│       └── project-b.md
│
├── public/
│   └── screenshots/            # Project images, referenced from projects.json
│
├── .env.example                # AI_API_KEY, AI_BASE_URL, AI_MODEL
├── tailwind.config.ts
├── next.config.ts
└── package.json
```

---

## Implementation plan

### Phase 1: Rewrite core to reactive agent architecture

**This is the fundamental change — everything else builds on this.**

1. **Create `lib/tools.ts`** — define ALL agent tools as JSON schemas. Two layers:
   - **Panel tools:** show_project, show_skills, show_contact, show_timeline, show_gallery, hide_panel
   - **Action tools:** scroll_timeline_to, highlight_period, focus_screenshot, highlight_skill, highlight_project_detail, compare_projects
   - Tools should be auto-enriched with available slugs/companies from data files so the model knows what values are valid.

2. **Rewrite `app/api/chat/route.ts`** — send tools array to the xAI API alongside messages and system prompt. Handle streaming response that includes both `content` and `tool_calls` in the delta. Read model/URL from env vars.

3. **Create `lib/stream-parser.ts`** — parse the SSE stream on the client side. Extract text content AND tool calls from the stream. Emit structured events: `{ type: 'text', content: '...' }` and `{ type: 'tool_call', name: '...', args: {...} }`.

4. **Create `lib/tool-handler.ts`** — maps tool calls to UI state changes. Two responsibilities:
   - **Panel tools** → update panel state (open/close, type, slug)
   - **Action tools** → dispatch granular actions to panel components via an event bus or ref callbacks
   - **Action queue** — Layer 2 tools that depend on a panel being open get queued until the panel animation completes. Stagger: 100-200ms between actions.

5. **Create `lib/action-queue.ts`** — manages sequencing of tool actions. Ensures show_timeline() completes before scroll_timeline_to() fires. Handles parallel calls gracefully with small delays.

6. **Rewrite `components/Chat.tsx`** — use the new stream parser. On text events, append to current message. On tool_call events, dispatch to tool-handler which updates panel state OR fires actions into open panels. Remove all `[[token]]` parsing logic.

7. **Delete `lib/panel-parser.ts`** — no longer needed. Delete `lib/grok.ts` — dead code.

8. **Update system prompt** — remove `[[show:...]]` token instructions. Add tool usage instructions with examples:
   - "You have tools to control the UI. Use panel tools to show content, action tools to interact with it."
   - "When discussing career, open the timeline and scroll/highlight as you narrate."
   - "When showing a project, open the card and focus on relevant screenshots."
   - "Interleave tool calls with your text — call tools mid-sentence for a dynamic feel."

### Phase 2: Fix bugs, build interactive panels, make data-driven

9. **Fix `ProjectCard.tsx`** — move React import to top. Load project data from props. Support action tools: expose `focusScreenshot(index)` and `highlightDetail(field)` methods via ref or event listener.

10. **Create `components/ToolCallBadge.tsx`** — inline tool call indicator in chat. Shows tool name + args with animated appearance (fade in, subtle glow). Stacks vertically when multiple tools fire in sequence.

11. **Data-driven SkillsGrid** — read from `data/skills.json`. Support `highlight_skill(name)` action — when called, the matching skill badge pulses with accent color glow for 2s.

12. **Data-driven ContactCard** — read from `data/config.json`.

13. **Build Timeline component** — reads from `data/experience.json`. This is the showcase component:
    - Vertical timeline with company entries, dates, descriptions
    - Each entry is a DOM node with an ID (for scrolling/highlighting)
    - Exposes actions: `scrollTo(company)` — smooth scroll to entry, `highlightPeriod(company, years)` — pulse/glow effect on the entry for 2-3s
    - Supports being "driven" by the agent mid-conversation
    - Clean minimalist design — thin line, dot markers, cards on alternating sides

14. **Build Gallery component** — fullscreen lightbox for project screenshots. Supports `focus_screenshot(slug, index)` action — navigates to specific image and zooms in.

15. **Build comparison view** — `compare_projects` tool shows two ProjectCards side by side in the panel. Split layout.

16. **Expand `data/config.json`** — add theme, agent personality, greeting template.

17. **Wire `.env` variables** — `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`. No hardcoded values.

18. **Remove duplicates** — delete `assets/` folder, keep only `public/screenshots/`.

### Phase 3: Polish and wow factor

17. **Mobile responsive** — panel as full-screen overlay on small screens. Fixed input at bottom. Touch-friendly.

18. **Tool call animations** — when agent calls a tool, show a brief "thinking" animation, then the tool badge appears, then the panel slides in. Sequential micro-animations.

19. **Welcome screen** — staggered reveal: greeting → name (gradient) → suggested chips. Premium feel.

20. **Streaming UX** — tool calls trigger panel mid-stream. Text keeps flowing while panel animates. No blocking.

21. **Error handling** — API errors shown as friendly messages. Rate limit handling. Retry logic.

22. **SEO / meta** — dynamic meta tags from config.json. OG image. Good for link sharing.

23. **Theme transitions** — smooth color transitions when toggling dark/light. CSS transitions on custom properties.

### Phase 4: Open-source ready

24. **Multi-provider support** — abstract AI provider. Support xAI, OpenAI, Anthropic, Groq via config. All use OpenAI-compatible API format, so mainly just different base URLs and model names.

25. **README.md** — setup guide, screenshots, customization docs, architecture explanation. Show that it's an agent, not just a chat.

26. **Vercel deploy** — one-click deploy button. `vercel.json` if needed.

27. **Example data** — ship with placeholder person data so it works immediately on clone.

28. **Validation** — startup validation of required files and env vars. Clear error messages.

29. **Custom tools guide** — documentation on how to add your own tools (e.g., show_certifications, show_blog_posts). This is a key differentiator — extensible agent, not rigid template.

---

## Build order (execution sequence)

```
Phase 1 — Reactive agent core
  [1] lib/tools.ts — all tool definitions (panel + action layers)
  [2] Rewrite api/chat/route.ts — send tools to model, stream response
  [3] lib/stream-parser.ts — parse text + tool_calls from SSE
  [4] lib/tool-handler.ts — map tool_calls to UI state + panel actions
  [5] lib/action-queue.ts — sequence dependent actions (show → scroll → highlight)
  [6] Rewrite Chat.tsx — stream parser + tool handler + action dispatch
  [7] Delete panel-parser.ts + grok.ts
  [8] Update system prompt for tool-based agent with examples

Phase 2 — Interactive panels + data-driven
  [9] Fix ProjectCard.tsx — props, expose action methods
  [10] ToolCallBadge.tsx — inline tool call indicators
  [11] Data-driven SkillsGrid + highlight_skill action
  [12] Data-driven ContactCard
  [13] Timeline component — scrollTo + highlightPeriod actions (showcase)
  [14] Gallery component — focus_screenshot action
  [15] Comparison view — compare_projects
  [16] Expand config.json, wire env vars, create data/*.json files
  [17] Clean up (delete assets/, dead code)

Phase 3 — Polish
  [18] Mobile responsive (panel as overlay)
  [19] Action animations (scroll, highlight, zoom micro-animations)
  [20] Welcome screen animation
  [21] Error handling + loading states
  [22] SEO meta tags

Phase 4 — Ship
  [23] Multi-provider AI support
  [24] README + docs
  [25] Vercel deploy button
  [26] Example/placeholder data
  [27] Custom tools guide (how to add your own)
  [28] End-to-end test
```

---

## Setup (for anyone forking)

```bash
# 1. Clone
git clone https://github.com/rollacode/ai-portfolio
cd ai-portfolio

# 2. Install
npm install

# 3. Add your content
#    Edit portfolio/*.md with your info
#    Edit data/config.json with your name, links, questions
#    Edit data/projects.json with your projects
#    Add screenshots to public/screenshots/

# 4. Get an API key (any OpenAI-compatible provider works)
cp .env.example .env
#    Add your key:
#    AI_API_KEY=your_key
#    AI_BASE_URL=https://api.x.ai/v1  (or openai, groq, etc.)
#    AI_MODEL=grok-3-mini-fast

# 5. Run
npm run dev
# → http://localhost:3000

# 6. (Optional) Add custom tools
#    See docs/custom-tools.md for how to extend the agent

# 7. Deploy
#    Push to GitHub → connect to Vercel → done
```

---

## Notes

- **This is an agent, not a chatbot.** The function calling is the key differentiator. It shows visitors AND potential employers that you understand agent architecture.
- Keep the AI model cheap and fast. `grok-3-mini-fast` supports function calling and is ideal — low latency, low cost, good enough for portfolio Q&A.
- System prompt stays under 10k tokens. No RAG, no vector DB, no complexity.
- The template should work with zero code changes — only data file edits. Adding custom tools is optional and documented.
- First impression matters. Welcome screen + first agent response need to be snappy (<1s to first token) and visually smooth.
- Tool calls are the "wow" factor. When the visitor sees the agent actively calling `show_project()` and the panel slides in — that's the moment.
