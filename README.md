# AI Portfolio Agent

An interactive portfolio website where visitors chat with an AI agent that has **reactive tools** to control the UI. The agent can show projects, scroll timelines, highlight skills, open galleries — all mid-conversation with streaming.

Built with Next.js 15, Tailwind CSS, and any OpenAI-compatible LLM provider.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Frollacode%2Fai-portfolio&env=AI_API_KEY,AI_BASE_URL,AI_MODEL&envDescription=API%20key%20and%20endpoint%20for%20your%20LLM%20provider&envLink=https%3A%2F%2Fgithub.com%2Frollacode%2Fai-portfolio%23setup)

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

## Setup

```bash
git clone https://github.com/rollacode/ai-portfolio.git
cd ai-portfolio
npm install
cp .env.example .env
```

Edit `.env` with your API key:

```env
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.x.ai/v1
AI_MODEL=grok-3-mini-fast
```

Works with any OpenAI-compatible provider — xAI/Grok, OpenAI, Groq, Together AI, Ollama (local). See `.env.example` for all provider examples.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Fork & make it yours

All personal content lives in `portfolio/` — edit these JSON files and deploy:

| File | What it contains |
|------|-----------------|
| `config.json` | Name, bio, social links, theme colors, agent personality, suggested questions |
| `projects.json` | Projects with slugs, descriptions, tech stacks, links, screenshots, writeups |
| `skills.json` | Skills grouped by category (primary, strong, AI, working knowledge, hobby) |
| `experience.json` | Career timeline entries with company, role, years, description |
| `recommendations.json` | LinkedIn recommendations with author info and project references |

The agent's system prompt is built dynamically from these files at runtime — no hardcoded personal info in components.

## Stack

- **Next.js 15** with App Router and Turbopack
- **Tailwind CSS** — ultra-minimalist black & white design
- **Framer Motion** — panel and layout animations
- **react-markdown** — renders agent responses
- **IndexedDB** — persists chat messages and panel state across refreshes
- **SSE streaming** — real-time agent responses with interleaved tool calls

## Design

Three layout states:
- **Welcome** — centered landing with animated rolling placeholder
- **Chat** — full-width centered conversation
- **Split** — panel on left (`calc(100vw - 500px)`), chat compressed to 500px on right

No header, no toolbar clutter. Just a floating clear-chat + theme toggle in the top-right corner. Dark/light theme follows system preference with manual override.

## License

MIT
