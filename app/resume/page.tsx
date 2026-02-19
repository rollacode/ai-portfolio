'use client';

import config from '@/data/config.json';
import experience from '@/data/experience.json';
import skills from '@/data/skills.json';
import projects from '@/data/projects.json';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ResumePage() {
  const entries = experience as ExperienceEntry[];
  const allSkills = skills as Record<string, Skill[]>;
  const allProjects = projects as Project[];

  // Top projects — pick the most interesting ones
  const topProjects = allProjects.filter(p =>
    ['rekap', 'binaura', 'trax-retail', 'scan-mania', 'bugsee', 'sos-portal'].includes(p.slug)
  );

  return (
    <>
      {/* Print button — hidden in print */}
      <div className="fixed top-4 right-4 z-50 print:hidden flex gap-2">
        <a
          href="/"
          className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
        >
          Back
        </a>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-black dark:bg-white text-white dark:text-black hover:opacity-80 transition-opacity"
        >
          Download PDF
        </button>
      </div>

      {/* Resume content */}
      <div className="max-w-[800px] mx-auto px-6 py-12 print:px-0 print:py-0 print:max-w-none">

        {/* Header */}
        <header className="mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-black dark:text-white print:text-black">
            {config.name}
          </h1>
          <p className="mt-1 text-lg text-gray-600 dark:text-gray-400 print:text-gray-600">
            {config.bio}
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 print:text-gray-500">
            {config.location && (
              <span>{config.location}</span>
            )}
            {config.social?.email && (
              <a href={`mailto:${config.social.email}`} className="hover:text-black dark:hover:text-white print:text-gray-700">
                {config.social.email}
              </a>
            )}
            {config.social?.github && (
              <a href={config.social.github} className="hover:text-black dark:hover:text-white print:text-gray-700">
                GitHub
              </a>
            )}
            {config.social?.linkedin && (
              <a href={config.social.linkedin} className="hover:text-black dark:hover:text-white print:text-gray-700">
                LinkedIn
              </a>
            )}
          </div>
        </header>

        <hr className="border-gray-200 dark:border-neutral-800 print:border-gray-300 mb-8 print:mb-6" />

        {/* Skills */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-lg font-bold text-black dark:text-white print:text-black mb-3">
            Skills
          </h2>
          <div className="space-y-2">
            {Object.entries(allSkills).map(([category, categorySkills]) => {
              const labels: Record<string, string> = {
                primary: 'Expert',
                strong: 'Strong',
                ai: 'AI / LLM',
                working: 'Familiar',
              };
              return (
                <div key={category} className="flex gap-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 print:text-gray-500 w-20 flex-shrink-0">
                    {labels[category] || category}
                  </span>
                  <p className="text-sm text-gray-800 dark:text-gray-200 print:text-gray-800">
                    {(categorySkills as Skill[]).map(s => s.years ? `${s.name} (${s.years}y)` : s.name).join(' \u00b7 ')}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <hr className="border-gray-200 dark:border-neutral-800 print:border-gray-300 mb-8 print:mb-6" />

        {/* Experience */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-lg font-bold text-black dark:text-white print:text-black mb-4">
            Experience
          </h2>
          <div className="space-y-6 print:space-y-4">
            {entries.map((entry) => (
              <div key={entry.company}>
                <div className="flex justify-between items-baseline gap-4 flex-wrap">
                  <div>
                    <h3 className="font-semibold text-black dark:text-white print:text-black">
                      {entry.role}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600">
                      {entry.company} &middot; {entry.location}
                    </p>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 tabular-nums flex-shrink-0">
                    {entry.period}
                  </p>
                </div>
                <p className="mt-1.5 text-sm text-gray-700 dark:text-gray-300 print:text-gray-700 leading-relaxed">
                  {entry.description}
                </p>
                {entry.highlights.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {entry.highlights.map((h) => (
                      <li key={h} className="text-sm text-gray-600 dark:text-gray-400 print:text-gray-600 flex items-start">
                        <span className="mr-2 mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400 print:bg-gray-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <hr className="border-gray-200 dark:border-neutral-800 print:border-gray-300 mb-8 print:mb-6" />

        {/* Key Projects */}
        <section className="mb-8 print:mb-6">
          <h2 className="text-lg font-bold text-black dark:text-white print:text-black mb-4">
            Key Projects
          </h2>
          <div className="space-y-4 print:space-y-3">
            {topProjects.map((project) => (
              <div key={project.slug}>
                <div className="flex justify-between items-baseline gap-4 flex-wrap">
                  <h3 className="font-semibold text-black dark:text-white print:text-black">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 print:text-gray-500 tabular-nums flex-shrink-0">
                    {project.period}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 print:text-gray-700 leading-relaxed">
                  {project.description}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 print:text-gray-500">
                  {project.stack.join(' \u00b7 ')}
                </p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
          /* Hide everything except resume */
          nav, footer, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
