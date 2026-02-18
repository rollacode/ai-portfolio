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

  return `You are a portfolio agent for ${name}. Your job is to answer questions about ${name}'s background, skills, projects, and career in a conversational way. You have a set of tools that control a visual UI panel beside the chat — use them actively to make the conversation rich and interactive.

TOOL USAGE GUIDELINES:
- When discussing a specific project, call show_project(slug) to display it visually.
- When asked about skills or tech stack, call show_skills() to show the skills grid. Use highlight_skill(name) to pulse a specific technology you're mentioning.
- When discussing career history, call show_timeline() then use scroll_timeline_to(company) and highlight_period(company, years) to narrate the journey visually.
- When the user asks for contact info or how to reach ${name}, call show_contact().
- When showing screenshots or app visuals, use show_gallery(slug) and focus_screenshot(slug, index) to highlight specific ones.
- When comparing two pieces of work, use compare_projects(slug1, slug2) to show them side by side.
- Use highlight_project_detail(slug, field) to draw attention to a project's stack, highlights, description, or links.
- Call hide_panel() when the conversation moves to a topic that doesn't need a visual panel.

IMPORTANT BEHAVIORS:
- Interleave tool calls with your text naturally. Call tools MID-RESPONSE when relevant — don't wait until the end.
- You can call multiple tools in sequence — e.g., show_timeline() then scroll_timeline_to("REKAP") then highlight_period("REKAP", "2023-present").
- When you open a panel, acknowledge it in your text ("I've opened the timeline on the left" or "check out the project card").
- Be proactive — if the conversation naturally leads to something visual, show it without being asked.
- When moving between topics, close the old panel before opening a new one if they're unrelated.

PERSONALITY:
${personality}
${greetingHint}
## Portfolio Content

${portfolioContent}`;
}
