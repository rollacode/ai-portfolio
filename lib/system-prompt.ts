// Builds system prompt from structured JSON data

import fs from 'fs';
import path from 'path';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface AgentConfig {
  personality?: string;
  greeting?: string;
}

interface Language {
  language: string;
  level: string;
}

interface Education {
  university: string;
  degree: string;
  period: string;
}

interface Strength {
  title: string;
  description: string;
}

interface Social {
  github?: string;
  linkedin?: string;
  email?: string;
}

interface PortfolioConfig {
  name: string;
  firstName?: string;
  title?: string;
  bio?: string;
  location?: string;
  workModes?: string[];
  languages?: Language[];
  education?: Education;
  strengths?: Strength[];
  social?: Social;
  agent?: AgentConfig;
  [key: string]: unknown;
}

interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  location: string;
  description: string;
  highlights: string[];
  stack: string[];
}

interface Skill {
  id: string;
  name: string;
  years?: number;
  level: string;
}

interface Project {
  slug: string;
  name: string;
  stack: string[];
  period: string;
  description: string;
  highlights: string[];
  links?: Record<string, string>;
  skillIds?: string[];
  writeup?: string;
}

interface Recommendation {
  name: string;
  title: string;
  date: string;
  relation: string;
  text: string;
}

// -----------------------------------------------------------------------------
// Loaders
// -----------------------------------------------------------------------------

const portfolioDir = path.join(process.cwd(), 'portfolio');

function loadJSON<T>(filename: string): T | null {
  const filePath = path.join(portfolioDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

// -----------------------------------------------------------------------------
// Content formatters (JSON → readable text for the agent)
// -----------------------------------------------------------------------------

function formatAbout(config: PortfolioConfig): string {
  const lines: string[] = ['# About'];
  lines.push(`**${config.name}** — ${config.bio || ''}`);
  if (config.location) lines.push(`Location: ${config.location}`);
  if (config.workModes?.length) lines.push(`Work modes: ${config.workModes.join(', ')}`);
  if (config.social?.email) lines.push(`Email: ${config.social.email}`);
  if (config.social?.github) lines.push(`GitHub: ${config.social.github}`);
  if (config.social?.linkedin) lines.push(`LinkedIn: ${config.social.linkedin}`);

  if (config.languages?.length) {
    lines.push('\n## Languages');
    for (const lang of config.languages) {
      lines.push(`- ${lang.language}: ${lang.level}`);
    }
  }

  if (config.education) {
    lines.push('\n## Education');
    lines.push(`${config.education.university} — ${config.education.degree} (${config.education.period})`);
  }

  return lines.join('\n');
}

function formatStrengths(strengths: Strength[]): string {
  const lines: string[] = ['# What Makes Him Special'];
  for (const s of strengths) {
    lines.push(`\n### ${s.title}`);
    lines.push(s.description);
  }
  return lines.join('\n');
}

function formatExperience(entries: ExperienceEntry[]): string {
  const lines: string[] = ['# Work Experience'];
  for (const e of entries) {
    lines.push(`\n## ${e.role} — ${e.company}`);
    lines.push(`${e.period} | ${e.location}`);
    lines.push(e.description);
    if (e.highlights.length) {
      for (const h of e.highlights) lines.push(`- ${h}`);
    }
    if (e.stack.length) lines.push(`Stack: ${e.stack.join(', ')}`);
  }
  return lines.join('\n');
}

function formatSkills(skills: Record<string, Skill[]>): string {
  const labels: Record<string, string> = {
    primary: 'Expert',
    strong: 'Strong',
    ai: 'AI / LLM',
    working: 'Working Knowledge',
  };
  const lines: string[] = ['# Skills'];
  for (const [cat, catSkills] of Object.entries(skills)) {
    const label = labels[cat] || cat;
    const items = catSkills.map(s => {
      const parts = [s.name];
      if (s.years) parts.push(`${s.years}y`);
      if (s.level && s.level !== label.toLowerCase()) parts.push(s.level);
      return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(', ')})` : parts[0];
    }).join(' · ');
    lines.push(`\n**${label}:** ${items}`);
  }
  return lines.join('\n');
}

function formatProjects(projects: Project[]): string {
  const lines: string[] = ['# Projects Index (use these slugs with show_project tool)'];
  for (const p of projects) {
    lines.push(`\n## ${p.name} [slug: "${p.slug}"]`);
    lines.push(`Period: ${p.period}`);
    lines.push(`Stack: ${p.stack.join(', ')}`);
    lines.push(p.description);
    if (p.highlights.length) {
      for (const h of p.highlights) lines.push(`- ${h}`);
    }
    if (p.skillIds?.length) {
      lines.push(`Skill IDs: ${p.skillIds.join(', ')}`);
    }
    if (p.links && Object.keys(p.links).length) {
      const linkParts = Object.entries(p.links).map(([k, v]) => `${k}: ${v}`);
      lines.push(`Links: ${linkParts.join(' | ')}`);
    }
    if (p.writeup) {
      lines.push(`\n### Deep Dive\n${p.writeup}`);
    }
  }
  return lines.join('\n');
}

function formatRecommendations(recs: Recommendation[]): string {
  const lines: string[] = ['# Recommendations'];
  for (const r of recs) {
    lines.push(`\n## ${r.name}`);
    lines.push(`*${r.title}* — ${r.date} (${r.relation})`);
    lines.push(r.text);
  }
  return lines.join('\n');
}

// -----------------------------------------------------------------------------
// Public: load all portfolio content as text
// -----------------------------------------------------------------------------

export function loadPortfolioContent(): string {
  const config = loadJSON<PortfolioConfig>('config.json');
  const experience = loadJSON<ExperienceEntry[]>('experience.json');
  const skills = loadJSON<Record<string, Skill[]>>('skills.json');
  const projects = loadJSON<Project[]>('projects.json');
  const recommendations = loadJSON<Recommendation[]>('recommendations.json');

  const sections: string[] = [];

  if (config) sections.push(formatAbout(config));
  if (config?.strengths?.length) sections.push(formatStrengths(config.strengths));
  if (experience) sections.push(formatExperience(experience));
  if (skills) sections.push(formatSkills(skills));
  if (projects) sections.push(formatProjects(projects));
  if (recommendations) sections.push(formatRecommendations(recommendations));

  return sections.filter(Boolean).join('\n\n---\n\n');
}

// -----------------------------------------------------------------------------
// System prompt builder
// -----------------------------------------------------------------------------

export function buildSystemPrompt(): string {
  const config = loadJSON<PortfolioConfig>('config.json') ?? { name: 'Unknown' };
  const name = config.name;
  const firstName = config.firstName || name.split(' ')[0];
  const portfolioContent = loadPortfolioContent();

  const personality =
    config.agent?.personality ??
    `- Speak in third person about ${name} ("he built...", "his experience includes...")
- Professional but friendly, conversational tone
- Concise but informative — don't write walls of text
- If you don't know something, say so honestly`;

  const greetingHint = config.agent?.greeting
    ? `\nDEFAULT GREETING (use this when the conversation starts):\n"${config.agent.greeting}"\n`
    : '';

  return `You are a portfolio assistant for ${firstName}. You talk about ${firstName} (not "${name}" — just the first name, keep it casual). You ALWAYS use tools to show things visually. You are an agent that ACTS on the UI.

CONVERSATION STYLE:
- Be warm, human, like a friendly colleague — not a corporate chatbot
- Use first name only: "${firstName}", never full name "${name}"
- RESPOND IN THE SAME LANGUAGE AS THE USER. Russian → Russian. English → English.
- Keep text short: 2-3 sentences between tool calls. Let the visuals talk.

VISITOR ENGAGEMENT:
- In your FIRST response, answer their question AND casually ask who they are. Example: "...by the way, what's your name? What brings you here?"
- CRITICAL RULE: EVERY TIME the visitor reveals ANY personal information — name, company, role, where they're from, what they do, their interest, contact info — you MUST call remember_visitor() with that info. NO EXCEPTIONS. Even if they only mention one thing like "I'm from Trax" — call remember_visitor({company: "Trax"}) immediately. If they later say "I'm Dolev" — call remember_visitor({name: "Dolev"}) again. The system merges everything automatically by visitor session.
- Don't ask "can I save this?" — just do it silently and confirm naturally ("got it!", "noted!").
- Be genuinely curious — ask about their company, what they're looking for, etc. But don't interrogate — weave it naturally.
- IMPORTANT: At some natural point in the conversation (after a few messages, not immediately), casually ask how to reach them — email, Telegram, whatever they prefer. Frame it as "${firstName} might want to get in touch" or "in case ${firstName} wants to follow up". Save it via remember_visitor() using the specific field (email, telegram, phone, or linkedin).

TOOL RULES:

1. ALWAYS USE TOOLS. Every response needs at least one tool call (except pure small talk). Skills → show_skills + highlight_skill. Project → show_project. All projects → show_projects. Career → show_timeline + scroll + highlight.

2. SWITCHING PANELS: Just call the new show_* tool directly. Old panel auto-closes.

3. HIGHLIGHT EVERYTHING YOU MENTION. Skill → highlight_skill(). Company on timeline → scroll_timeline_to() + highlight_period(). Project on projects timeline → scroll_to_project() + highlight_project(). Every time.

4. remember_visitor() — MANDATORY. Call it EVERY SINGLE TIME the visitor reveals ANY personal info.
   CRITICAL: Use the CORRECT FIELD for each type of info. NEVER put contact details into "notes":
   - Phone number → phone field: remember_visitor({phone: "+972 521234567"})
   - Telegram handle → telegram field: remember_visitor({telegram: "@dolev"})
   - Email address → email field: remember_visitor({email: "dolev@gmail.com"})
   - LinkedIn → linkedin field: remember_visitor({linkedin: "https://linkedin.com/in/dolev"})
   - Name → name field. Company → company field. Job title → role field.
   - "notes" is ONLY for freeform observations that don't fit other fields.
   WRONG: remember_visitor({notes: "phone +972, telegram @dolev"}) ← NEVER DO THIS
   RIGHT: remember_visitor({phone: "+972 521234567", telegram: "@dolev"}) ← ALWAYS DO THIS
   Multiple calls are fine — they merge automatically by visitor session.

TOOL PATTERNS:

Skills → show_skills() → highlight_skill("X") → text → highlight_skill("Y") → ...
Career → show_timeline() → scroll_timeline_to("Co") → highlight_period("Co", "years") → text → next...
One project → show_project("slug") → highlight_project_detail("slug", "stack") → ...
All projects → show_projects() → scroll_to_project("slug") → highlight_project("slug") → text → next...
Visitor shares name → remember_visitor({name: "Dolev"})
Visitor shares phone + telegram → remember_visitor({phone: "+972 52-123", telegram: "@dolev"})
Visitor shares email → remember_visitor({email: "dolev@gmail.com"})
Visitor shares company + role → remember_visitor({company: "Gong", role: "CTO"})
Resume/CV request → show_resume(). The panel has PDF and Markdown download buttons built in.

PERSONALITY:
${personality}
${greetingHint}
## Portfolio Content

${portfolioContent}`;
}
