'use client';

import { useCallback } from 'react';
import config from '@/portfolio/config.json';
import experience from '@/portfolio/experience.json';
import skills from '@/portfolio/skills.json';
import projects from '@/portfolio/projects.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const entries = experience as ExperienceEntry[];
const allSkills = skills as Record<string, Skill[]>;
const topProjectSlugs = ['rekap', 'binaura', 'trax-retail', 'scan-mania', 'bugsee', 'sos-portal'];
const topProjects = (projects as Project[]).filter(p => topProjectSlugs.includes(p.slug));

const categoryLabels: Record<string, string> = {
  primary: 'Expert',
  strong: 'Strong',
  ai: 'AI / LLM',
  working: 'Familiar',
};

/* ------------------------------------------------------------------ */
/*  Markdown generator                                                 */
/* ------------------------------------------------------------------ */

function generateMarkdown(): string {
  const lines: string[] = [];

  lines.push(`# ${config.name}`);
  lines.push(`**${config.bio}**\n`);
  lines.push(`${config.location || ''}`);

  const contacts: string[] = [];
  if (config.social?.email) contacts.push(config.social.email);
  if (config.social?.github) contacts.push(config.social.github);
  if (config.social?.linkedin) contacts.push(config.social.linkedin);
  if (contacts.length) lines.push(contacts.join(' | '));

  lines.push('\n---\n');
  lines.push('## Skills\n');
  for (const [cat, catSkills] of Object.entries(allSkills)) {
    const label = categoryLabels[cat] || cat;
    const items = (catSkills as Skill[]).map(s => s.years ? `${s.name} (${s.years}y)` : s.name).join(', ');
    lines.push(`**${label}:** ${items}\n`);
  }

  lines.push('\n---\n');
  lines.push('## Experience\n');
  for (const e of entries) {
    lines.push(`### ${e.role} — ${e.company}`);
    lines.push(`*${e.period} | ${e.location}*\n`);
    lines.push(`${e.description}\n`);
    for (const h of e.highlights) {
      lines.push(`- ${h}`);
    }
    lines.push('');
  }

  lines.push('\n---\n');
  lines.push('## Key Projects\n');
  for (const p of topProjects) {
    lines.push(`### ${p.name}`);
    lines.push(`*${p.period}*\n`);
    lines.push(`${p.description}\n`);
    lines.push(`Stack: ${p.stack.join(', ')}\n`);
  }

  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Download helpers                                                   */
/* ------------------------------------------------------------------ */

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ResumePanel() {
  const handleDownloadPdf = useCallback(() => {
    // Temporarily force light theme so PDF is always light
    const html = document.documentElement;
    const wasDark = html.classList.contains('dark');
    if (wasDark) html.classList.remove('dark');

    // Small delay to let the browser repaint before opening print dialog
    requestAnimationFrame(() => {
      window.print();
      // Restore dark mode after print dialog closes
      if (wasDark) html.classList.add('dark');
    });
  }, []);

  const handleDownloadMd = useCallback(() => {
    const md = generateMarkdown();
    const safeName = config.name.replace(/\s+/g, '_');
    downloadFile(md, `${safeName}_Resume.md`, 'text/markdown');
  }, []);

  return (
    <div>
      {/* Download buttons (hidden when printing) */}
      <div className="flex gap-2 mb-6 print:hidden">
        <button
          onClick={handleDownloadPdf}
          className="px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700
                     text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Download PDF
        </button>
        <button
          onClick={handleDownloadMd}
          className="px-3 py-1.5 text-xs font-medium rounded-lg
                     bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700
                     text-gray-700 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Download Markdown
        </button>
      </div>

      {/* Resume content */}
      <div className="space-y-6 print:space-y-4">

        {/* Header */}
        <header>
          <h1 className="text-2xl font-bold text-black dark:text-white print:text-black">
            {config.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 print:text-gray-700">
            {config.bio}
          </p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 print:text-gray-600">
            {config.location && <span>{config.location}</span>}
            {config.social?.email && (
              <a href={`mailto:${config.social.email}`} className="hover:text-black dark:hover:text-white">
                {config.social.email}
              </a>
            )}
            {config.social?.github && (
              <a href={config.social.github} target="_blank" rel="noopener noreferrer" className="hover:text-black dark:hover:text-white">
                GitHub
              </a>
            )}
            {config.social?.linkedin && (
              <a href={config.social.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-black dark:hover:text-white">
                LinkedIn
              </a>
            )}
          </div>
        </header>

        <hr className="border-gray-200 dark:border-neutral-800 print:border-gray-300" />

        {/* Skills */}
        <section>
          <h2 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-3">
            Skills
          </h2>
          <div className="space-y-1.5">
            {Object.entries(allSkills).map(([cat, catSkills]) => (
              <div key={cat} className="flex gap-2 text-xs">
                <span className="font-medium text-gray-500 dark:text-gray-400 print:text-gray-600 w-16 flex-shrink-0">
                  {categoryLabels[cat] || cat}
                </span>
                <p className="text-gray-700 dark:text-gray-300 print:text-gray-800 leading-relaxed">
                  {(catSkills as Skill[]).map(s =>
                    s.years ? `${s.name} (${s.years}y)` : s.name
                  ).join(' \u00b7 ')}
                </p>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-200 dark:border-neutral-800 print:border-gray-300" />

        {/* Experience */}
        <section>
          <h2 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-4">
            Experience
          </h2>
          <div className="space-y-5">
            {entries.map((entry) => (
              <div key={entry.company}>
                <div className="flex justify-between items-baseline gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold text-black dark:text-white">
                      {entry.role}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600">
                      {entry.company} &middot; {entry.location}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 print:text-gray-500 tabular-nums flex-shrink-0">
                    {entry.period}
                  </p>
                </div>
                <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300 print:text-gray-800 leading-relaxed">
                  {entry.description}
                </p>
                {entry.highlights.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {entry.highlights.map((h) => (
                      <li key={h} className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-700 flex items-start">
                        <span className="mr-2 mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-200 dark:border-neutral-800 print:border-gray-300" />

        {/* Key Projects */}
        <section>
          <h2 className="text-sm font-bold text-black dark:text-white uppercase tracking-wider mb-4">
            Key Projects
          </h2>
          <div className="space-y-4">
            {topProjects.map((project) => (
              <div key={project.slug}>
                <div className="flex justify-between items-baseline gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-black dark:text-white">
                    {project.name}
                  </h3>
                  <p className="text-xs text-gray-400 print:text-gray-500 tabular-nums flex-shrink-0">
                    {project.period}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 print:text-gray-800 leading-relaxed">
                  {project.description}
                </p>
                <p className="mt-1 text-[11px] text-gray-400 print:text-gray-500">
                  {project.stack.join(' \u00b7 ')}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
