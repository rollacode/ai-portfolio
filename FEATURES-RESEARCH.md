# Feature Research: What's Next for the AI Portfolio Agent

> 3 iterations of self-critique. Raw ideas -> brutal filtering -> final reality check.

---

## Current State (for context)

The portfolio already has: 22 function-calling tools across 4 layers, SSE streaming, split-panel UI control, action queue with animation stagger, 3 easter eggs (Showtime/Games/Fallout), visitor tracking with Redis, insight cards, recommendations, tech radar, multilingual support, Amplitude analytics. **This is already ahead of 95% of AI portfolio projects out there** — most are basic text-in/text-out chatbots.

---

## Iteration 1: Raw Ideas (20 ideas)

| # | Idea | Verdict |
|---|------|---------|
| 1 | Voice interaction (TTS/STT) | KEEP |
| 2 | MCP Server — portfolio as protocol | KEEP |
| 3 | 3D/Three.js immersive world | DROP — fights minimalist identity, massive effort |
| 4 | Live code sandbox demos | DROP — projects are native apps, can't demo in browser |
| 5 | Multiplayer co-browsing | DROP — recruiters don't co-browse, gimmick |
| 6 | AI-generated video walkthroughs | DROP — too slow to generate, too complex |
| 7 | GitHub activity integration | KEEP (minor) |
| 8 | Adaptive visitor detection | KEEP |
| 9 | "Hire me" rate negotiation agent | DROP — dangerous, could backfire |
| 10 | Resume tailoring per JD | KEEP |
| 11 | Project demo sandboxes | DROP — same as #4 |
| 12 | Visitor heatmap | DROP — just install Hotjar, not innovative |
| 13 | AI cover letter generator | DROP — gimmicky |
| 14 | LinkedIn auto-import | DROP — JSON is the source of truth already |
| 15 | Job description match analysis | MERGE with #10 |
| 16 | Screen recording playback | DROP — galleries already exist, video is heavy |
| 17 | Multi-language voice | MERGE with #1 |
| 18 | Conversation export as PDF | KEEP (added mid-iteration) |
| 19 | Real-time Telegram notifications | KEEP (added mid-iteration) |
| 20 | npx CLI portfolio | KEEP (added mid-iteration) |

**Survived:** 8 ideas out of 20.

---

## Iteration 2: Deeper Critique

### Voice (TTS/STT)
- WOW factor is enormous — almost nobody has a portfolio you can TALK to
- Risk: microphone permissions, auto-play blocked, people browse at work
- Mitigation: opt-in only (mic button), start with free Web Speech API, upgrade to ElevenLabs later
- Browser's `speechSynthesis` is free but robotic; ElevenLabs is ~$5/mo but sounds incredible
- **Verdict: KEEP — opt-in reduces risk, even 10% usage is memorable**

### MCP Server
- Who uses it? Devs with Claude Desktop, AI-savvy recruiters
- Real value: it's a FLEX — proves you understand cutting-edge AI infra
- Implementation: trivially wrap existing JSON as MCP tools
- Could double as `npx andrey-kovalev` CLI
- **Verdict: KEEP — low effort, high signal. No-brainer.**

### JD Matching
- Recruiter pastes a job description -> agent shows skill overlap, experience matches, gaps
- One new tool (`match_job`) + one panel component
- Directly helps recruiter do their job = they remember you
- **Verdict: KEEP — very strong practical value**

### GitHub Activity
- Anyone can link their GitHub. Agent already has project data
- Live commits don't add much to a portfolio conversation
- **Verdict: DOWNGRADE to nice-to-have**

### Adaptive Detection
- Already works for language (Russian/English)
- Could detect CTO vs HR vs dev and adjust depth
- Pure prompt engineering, no code changes
- **Verdict: KEEP as prompt improvement, not feature**

### Conversation Export
- Recruiter chats -> downloads a beautiful PDF summary to share with team
- Surprisingly practical: "Hey team, check out this candidate I found"
- Low effort: collect messages, format, generate
- **Verdict: KEEP**

### Telegram Notifications
- Agent already saves visitor data, but Andrey doesn't get notified
- "A CTO from Google just asked about your AI experience" -> instant Telegram ping
- Tiny webhook, huge practical value for job hunting
- **Verdict: KEEP — very practical**

### npx CLI
- `npx andrey-kovalev` -> terminal-based resume with interactive commands
- Developer audience loves this, very shareable
- Can reuse same portfolio JSON data
- **Verdict: KEEP as bonus, pairs well with MCP**

---

## Iteration 3: Final Reality Check

Question: **What would make a recruiter/CTO go "holy shit" and want to hire Andrey?**

---

## Final Recommendations (ordered by impact/effort)

### 1. MCP Server — Portfolio as Protocol
**Impact: HIGH | Effort: LOW (1 day)**

Expose the portfolio as an MCP server. Any AI assistant (Claude Desktop, Cursor, etc.) can query Andrey's experience directly:

```
User (in Claude Desktop): "Tell me about Andrey Kovalev's AI experience"
Claude: *queries MCP server* -> structured answer from real data
```

Tools to expose:
- `get_about()` -> bio, strengths, languages
- `get_experience(company?)` -> work history
- `get_skills(category?)` -> skills with levels
- `get_projects(filter?)` -> project details
- `get_recommendations()` -> testimonials
- `match_job(description)` -> skill overlap analysis

**Why this wins:** Shows you're building with the most cutting-edge AI infra of 2026. Can literally demo it in an interview. Almost zero competition — nobody has done this for a portfolio yet.

---

### 2. Job Description Matching Tool
**Impact: HIGH | Effort: LOW (1 day)**

New tool: `match_job(description)`. Visitor (recruiter/HR) pastes a job description, agent:
1. Extracts required skills, experience, responsibilities
2. Maps to portfolio data (skills.json, experience.json, projects.json)
3. Opens a visual "Match Card" panel showing:
   - Overall match % (radar chart or simple bar)
   - Skill overlap (green = match, yellow = adjacent, red = gap)
   - Relevant projects for each requirement
   - Experience years vs required years
   - Relevant recommendations that speak to each requirement

**Why this wins:** Directly useful to the person deciding whether to hire. Saves them 30 minutes of manual matching. They'll remember this.

---

### 3. Real-Time Telegram Notifications
**Impact: HIGH | Effort: LOW (half day)**

When `remember_visitor()` fires with meaningful data (name, company, role), send a Telegram message:

```
New visitor on portfolio:
Name: John Smith
Company: Google
Role: Engineering Manager
Interest: AI experience
Said: "Looking for senior engineers with LLM agent experience"
```

Implementation: Telegram Bot API is one HTTP POST. Add to existing visitor save flow. env var `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`.

**Why this wins:** Andrey knows instantly when someone important visits. Can follow up within minutes instead of checking visitor logs manually.

---

### 4. Conversation Export
**Impact: MEDIUM | Effort: LOW (1 day)**

New tool: `export_conversation()`. Agent offers at end of conversation:

> "Want me to put together a summary of what we discussed? I can generate a PDF you can share with your team."

Generates a clean document with:
- Visitor info (if shared)
- Key topics discussed
- Projects highlighted
- Skills matched
- Recommendations referenced
- Direct link back to portfolio

Implementation: Client-side PDF generation (html2pdf.js or jsPDF). Or markdown export that opens in new tab.

**Why this wins:** Recruiter shares it with hiring manager -> Andrey's portfolio reaches people who never visited the site.

---

### 5. Voice Mode (Opt-in)
**Impact: VERY HIGH | Effort: MEDIUM (2-3 days)**

Opt-in microphone button next to chat input. Press to talk, agent responds with voice.

**Phase 1 (free):**
- STT: Web Speech API (`SpeechRecognition`) — works in Chrome/Edge, decent quality
- TTS: Browser `speechSynthesis` — robotic but free
- Transcribed text goes through existing chat pipeline
- Agent response is read aloud

**Phase 2 (premium):**
- STT: Deepgram (<250ms latency, $0.0059/min)
- TTS: ElevenLabs (natural voice, ~$5/mo for hobby tier)
- Stream TTS as agent streams text — near real-time conversation

**Architecture:** Minimal changes. Voice is just another input/output layer on top of existing chat:
```
Mic -> STT -> sendMessage(text) -> existing pipeline -> response text -> TTS -> speaker
```

**Why this wins:** "I talked to a portfolio website and it talked back" is a story people tell at dinner. Absolutely nobody does this. Viral potential is massive.

---

### 6. Adaptive Visitor Personas (Prompt-only)
**Impact: MEDIUM | Effort: VERY LOW (prompt changes)**

Enhance system prompt to detect and adapt:

| Detected Role | Behavior |
|---|---|
| CTO / Tech Lead | Focus on architecture, system design, scale |
| HR / Recruiter | Focus on soft skills, recommendations, culture fit |
| Developer | Focus on code, tools, technical depth |
| Founder / PM | Focus on product sense, shipping record, ownership |
| Curious visitor | Focus on cool projects, easter eggs, fun |

Detection: from `remember_visitor()` data or conversation context. No new code — pure prompt engineering.

---

### 7. npx CLI Portfolio (Bonus)
**Impact: MEDIUM | Effort: LOW (1 day)**

`npx andrey-kovalev` -> interactive terminal portfolio:
- ASCII art header
- Commands: `about`, `skills`, `projects`, `experience`, `contact`
- Pulls from same portfolio JSON (published as npm package)
- Links back to web portfolio

Pairs perfectly with MCP server — same data, different interface. Developer audience loves this. Very shareable on Twitter/LinkedIn.

---

## What NOT to Build

| Idea | Why Not |
|---|---|
| 3D/Three.js world | Fights the minimalist identity. Weeks of work. Different project entirely. |
| Live code sandboxes | Projects are iOS/enterprise apps — can't meaningfully demo in browser |
| AI video generation | Slow, expensive, quality not reliable enough |
| Rate negotiation bot | Too risky. One wrong number and you lose an opportunity |
| Multiplayer co-browsing | Solution looking for a problem |
| Auto-apply to jobs | Liability nightmare, not a portfolio feature |

---

## Priority Roadmap

```
Week 1:  Telegram notifications + JD matching tool + adaptive personas (prompt)
Week 2:  MCP Server + npx CLI
Week 3:  Conversation export
Week 4:  Voice mode (Phase 1 with Web Speech API)
Future:  Voice Phase 2 (ElevenLabs/Deepgram upgrade)
```

---

## TL;DR

The portfolio is already exceptional. The highest-leverage additions are:
1. **MCP Server** — nobody has this, proves AI-native thinking
2. **JD Matching** — directly useful to recruiters
3. **Telegram alerts** — know when someone important visits
4. **Voice mode** — "I talked to a website" is unforgettable

Everything else is gravy.
