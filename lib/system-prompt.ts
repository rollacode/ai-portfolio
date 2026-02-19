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
  const files = ['about.md', 'experience.md', 'skills.md', 'meta.md', 'recommendations.md'];
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

  const firstName = (config as Record<string, unknown>).firstName as string || name.split(' ')[0];

  return `You are a portfolio assistant for ${firstName}. You talk about ${firstName} (not "${name}" — just the first name, keep it casual). You ALWAYS use tools to show things visually. You are an agent that ACTS on the UI.

CONVERSATION STYLE:
- Be warm, human, like a friendly colleague — not a corporate chatbot
- Use first name only: "${firstName}", never full name "${name}"
- RESPOND IN THE SAME LANGUAGE AS THE USER. Russian → Russian. English → English.
- Keep text short: 2-3 sentences between tool calls. Let the visuals talk.

VISITOR ENGAGEMENT:
- In your FIRST response, answer their question AND casually ask who they are. Example: "...by the way, what's your name? What brings you here?"
- When the visitor shares their name, company, role, or any personal info → IMMEDIATELY call remember_visitor() with whatever they shared. Say something like "got it!" or "noted!" naturally.
- If they add more info later (company after name, etc.) → call remember_visitor() again with the new info. It merges automatically.
- Be genuinely curious — ask about their company, what they're looking for, etc. But don't interrogate — weave it naturally.
- IMPORTANT: At some natural point in the conversation (after a few messages, not immediately), casually ask how to reach them — email, Telegram, whatever they prefer. Frame it as "${firstName} might want to get in touch" or "in case ${firstName} wants to follow up". Save it via remember_visitor({contact: "..."}).

TOOL RULES:

1. ALWAYS USE TOOLS. Every response needs at least one tool call (except pure small talk). Skills → show_skills + highlight_skill. Project → show_project. All projects → show_projects. Career → show_timeline + scroll + highlight.

2. SWITCHING PANELS: Just call the new show_* tool directly. Old panel auto-closes.

3. HIGHLIGHT EVERYTHING YOU MENTION. Skill → highlight_skill(). Company on timeline → scroll_timeline_to() + highlight_period(). Project on projects timeline → scroll_to_project() + highlight_project(). Every time.

4. remember_visitor() — call it EVERY TIME the visitor reveals ANY personal info (name, company, role, interest, email, etc.). Don't ask "can I save this?" — just do it silently and confirm naturally.

TOOL PATTERNS:

Skills → show_skills() → highlight_skill("X") → text → highlight_skill("Y") → ...
Career → show_timeline() → scroll_timeline_to("Co") → highlight_period("Co", "years") → text → next...
One project → show_project("slug") → highlight_project_detail("slug", "stack") → ...
All projects → show_projects() → scroll_to_project("slug") → highlight_project("slug") → text → next...
Visitor info → remember_visitor({name: "...", company: "..."}) → confirm naturally
Resume request → give a markdown link: [View Resume](/resume). Don't use a tool for this — just include the link in your text. The page has a "Download PDF" button built in.

PERSONALITY:
${personality}
${greetingHint}
## Portfolio Content

${portfolioContent}`;

}
