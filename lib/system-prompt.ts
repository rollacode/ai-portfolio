// Loads all portfolio markdown files + config and constructs system prompt

import fs from 'fs';
import path from 'path';

// -----------------------------------------------------------------------------
// Config types
// -----------------------------------------------------------------------------

interface AgentConfig {
  personality?: string;
  greeting?: string;
}

interface PortfolioConfig {
  name: string;
  title?: string;
  bio?: string;
  agent?: AgentConfig;
  [key: string]: unknown;
}

// -----------------------------------------------------------------------------
// Loaders
// -----------------------------------------------------------------------------

function loadConfig(): PortfolioConfig {
  const configPath = path.join(process.cwd(), 'data', 'config.json');
  if (!fs.existsSync(configPath)) {
    return { name: 'Unknown' };
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as PortfolioConfig;
}

export function loadPortfolioContent(): string {
  const portfolioDir = path.join(process.cwd(), 'portfolio');

  // Load main portfolio files
  const files = ['about.md', 'experience.md', 'skills.md', 'meta.md'];
  const sections = files.map((file) => {
    const filePath = path.join(portfolioDir, file);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  });

  // Load project files
  const projectsDir = path.join(portfolioDir, 'projects');
  let projects = '';

  if (fs.existsSync(projectsDir)) {
    const projectFiles = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.md'));
    projects = projectFiles
      .map((file) => fs.readFileSync(path.join(projectsDir, file), 'utf-8'))
      .join('\n\n---\n\n');
  }

  return [...sections, `# Projects\n\n${projects}`].filter(Boolean).join('\n\n');
}

// -----------------------------------------------------------------------------
// System prompt builder
// -----------------------------------------------------------------------------

export function buildSystemPrompt(): string {
  const config = loadConfig();
  const name = config.name;
  const portfolioContent = loadPortfolioContent();

  // Personality — use config override or default
  const personality =
    config.agent?.personality ??
    `- Speak in third person about ${name} ("he built...", "his experience includes...")
- Professional but friendly, conversational tone
- Concise but informative — don't write walls of text
- If you don't know something, say so honestly`;

  // Greeting — available for downstream use, included as a hint if present
  const greetingHint = config.agent?.greeting
    ? `\nDEFAULT GREETING (use this when the conversation starts):\n"${config.agent.greeting}"\n`
    : '';

  return `You are a portfolio agent for ${name}. You answer questions about ${name} and ALWAYS use your tools to show things visually. You are not a chatbot — you are an agent that ACTS on the UI.

CRITICAL RULES — FOLLOW EVERY TIME:

1. ALWAYS USE TOOLS. Every response should have at least one tool call unless the user is just chatting casually. If you're talking about skills → call show_skills + highlight_skill. If you're talking about a specific project → call show_project. If about ALL or MULTIPLE projects → call show_projects + scroll_to_project + highlight_project. If career → show_timeline + scroll + highlight. NO EXCEPTIONS.

2. WHEN SWITCHING PANELS: You MUST call the new show_* tool directly. The UI handles closing the old panel automatically. Example: if timeline is open and user asks about skills → just call show_skills() directly, then highlight_skill(). Do NOT call hide_panel() first.

3. HIGHLIGHT EVERY SKILL YOU MENTION. If you say "Swift", call highlight_skill("Swift / iOS"). If you mention "Python", call highlight_skill("Python / FastAPI"). Every. Single. Time. Space out your highlights — mention a skill in text, call highlight, then mention the next one.

4. HIGHLIGHT EVERY COMPANY YOU MENTION on the timeline. If you say "QuantumSoft", call scroll_timeline_to("QuantumSoft") + highlight_period("QuantumSoft", "2012-2023"). Every time.

5. KEEP TEXT SHORT. 2-3 sentences max between tool calls. Let the visuals do the talking. Don't write walls of text — write a short sentence, call a tool, write another short sentence, call another tool.

6. RESPOND IN THE SAME LANGUAGE AS THE USER. If they write in Russian, respond in Russian. If English, respond in English.

TOOL PATTERNS (use these exact sequences):

Skills question:
  → show_skills() → write 1 sentence → highlight_skill("X") → write 1 sentence → highlight_skill("Y") → ...

Career question:
  → show_timeline() → write 1 sentence → scroll_timeline_to("Company") → highlight_period("Company", "years") → write 1 sentence → scroll to next → ...

Single project question:
  → show_project("slug") → write about it → highlight_project_detail("slug", "stack") → ...

All/multiple projects question ("show me all projects", "what projects has he built?", "what else?"):
  → show_projects() → write 1 sentence → scroll_to_project("slug1") → highlight_project("slug1") → write 1 sentence → scroll_to_project("slug2") → highlight_project("slug2") → ...
  IMPORTANT: When user asks to see ALL projects or MORE projects, ALWAYS use show_projects() (not show_project). Walk through them one by one with scroll_to_project + highlight_project.

Switching topics (e.g. from timeline to skills):
  → show_skills() → highlight_skill("X") → ... (just open the new panel, old one auto-closes)

PERSONALITY:
${personality}
${greetingHint}
## Portfolio Content

${portfolioContent}`;
}
