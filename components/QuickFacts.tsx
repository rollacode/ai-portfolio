'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import projects from '@/portfolio/projects.json';
import skills from '@/portfolio/skills.json';
import experience from '@/portfolio/experience.json';
import recommendations from '@/portfolio/recommendations.json';
import config from '@/portfolio/config.json';

// ---------------------------------------------------------------------------
// Compute stats dynamically from portfolio data
// ---------------------------------------------------------------------------

function computeStats() {
  const totalProjects = projects.length;

  const totalSkills =
    skills.primary.length +
    skills.strong.length +
    skills.ai.length +
    skills.working.length +
    (skills.hobby?.length ?? 0);

  // Years of experience: earliest start year → current year
  const startYears = experience.map((e) => {
    const match = e.period.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0], 10) : Infinity;
  });
  const earliestYear = Math.min(...startYears);
  const yearsOfExperience = new Date().getFullYear() - earliestYear;

  const companies = new Set(experience.map((e) => e.company)).size;

  const linkedinRecs = recommendations.length;

  const languages = config.languages.length;

  return [
    { label: 'Projects', value: totalProjects, icon: '///' },
    { label: 'Skills', value: totalSkills, icon: '::' },
    { label: 'Years of experience', value: yearsOfExperience, icon: '>' },
    { label: 'Companies', value: companies, icon: '{}' },
    { label: 'LinkedIn recs', value: linkedinRecs, icon: '""' },
    { label: 'Languages spoken', value: languages, icon: 'Aa' },
  ];
}

// ---------------------------------------------------------------------------
// Animated counter hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf: number;

    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// ---------------------------------------------------------------------------
// Single stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  index: number;
}

function StatCard({ icon, value, label, index }: StatCardProps) {
  const count = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: 'easeOut' }}
      className="bg-gray-50/70 dark:bg-white/[0.05] rounded-xl p-5 flex flex-col items-center text-center"
    >
      <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 mb-2 select-none">
        {icon}
      </span>
      <span className="text-3xl font-mono font-bold text-gray-900 dark:text-white leading-none">
        {count}
      </span>
      <span className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuickFacts panel
// ---------------------------------------------------------------------------

export default function QuickFacts() {
  const stats = computeStats();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
    >
      {stats.map((stat, i) => (
        <StatCard
          key={stat.label}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          index={i}
        />
      ))}
    </motion.div>
  );
}
