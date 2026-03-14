'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

import projects from '@/portfolio/projects.json';
import skills from '@/portfolio/skills.json';
import experience from '@/portfolio/experience.json';
import recommendations from '@/portfolio/recommendations.json';
import config from '@/portfolio/config.json';

// ---------------------------------------------------------------------------
// Data computation
// ---------------------------------------------------------------------------

const skillCategories = [
  { key: 'primary' as const, label: 'Expert', count: skills.primary.length },
  { key: 'strong' as const, label: 'Strong', count: skills.strong.length },
  { key: 'ai' as const, label: 'AI', count: skills.ai.length },
  { key: 'working' as const, label: 'Working', count: skills.working.length },
  { key: 'hobby' as const, label: 'Hobby', count: skills.hobby?.length ?? 0 },
];

const totalSkills = skillCategories.reduce((sum, c) => sum + c.count, 0);

const startYears = experience.map((e) => {
  const match = e.period.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : Infinity;
});
const earliestYear = Math.min(...startYears);
const yearsOfExperience = new Date().getFullYear() - earliestYear;

const uniqueCompanies = [...new Set(experience.map((e) => e.company))];
const companiesCount = uniqueCompanies.length;

const totalProjects = projects.length;
const totalRecs = recommendations.length;

const topProjects = projects.slice(0, 5).map((p) => p.name.split(' - ')[0]);

const firstRecSnippet = recommendations[0]?.text
  ? recommendations[0].text.substring(0, 60) + '...'
  : '';

// ---------------------------------------------------------------------------
// SlotCounter — digit-strip spring animation
// ---------------------------------------------------------------------------

function SlotDigit({
  digit,
  delay,
  size,
}: {
  digit: number;
  delay: number;
  size: 'lg' | 'sm';
}) {
  const digitHeight = size === 'lg' ? 48 : 36;
  const textClass =
    size === 'lg'
      ? 'text-4xl font-mono font-bold text-gray-900 dark:text-gray-50'
      : 'text-3xl font-mono font-bold text-gray-900 dark:text-gray-50';

  return (
    <div
      className="overflow-hidden relative"
      style={{ height: digitHeight, width: digitHeight * 0.6 }}
    >
      <motion.div
        initial={{ y: -digitHeight * 5 }}
        animate={{ y: -digitHeight * digit }}
        transition={{
          type: 'spring',
          damping: 20,
          stiffness: 100,
          delay,
        }}
        className="flex flex-col items-center"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={textClass}
            style={{ height: digitHeight, lineHeight: `${digitHeight}px` }}
          >
            {i}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function SlotCounter({
  value,
  size = 'sm',
}: {
  value: number;
  size?: 'lg' | 'sm';
}) {
  const digits = String(value).split('').map(Number);

  return (
    <div className="flex items-center justify-center">
      {digits.map((d, i) => (
        <SlotDigit key={i} digit={d} delay={i * 0.05} size={size} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip for stacked bar
// ---------------------------------------------------------------------------

function BarSegment({
  label,
  count,
  percentage,
  shade,
}: {
  label: string;
  count: number;
  percentage: number;
  shade: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative h-full"
      style={{ width: `${percentage}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`h-full ${shade} transition-opacity hover:opacity-80`} />
      {hovered && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900 dark:bg-gray-100 text-gray-50 dark:text-gray-900 text-[10px] px-2 py-0.5 rounded pointer-events-none z-10">
          {label}: {count}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini timeline for hero card
// ---------------------------------------------------------------------------

function MiniTimeline() {
  return (
    <div className="flex items-center gap-0 w-full mt-3">
      {uniqueCompanies.map((company, i) => (
        <div key={company} className="flex items-center group flex-1 min-w-0">
          <div className="relative flex flex-col items-center">
            <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-lime-500 transition-colors shrink-0" />
            <span className="absolute top-3 text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {company}
            </span>
          </div>
          {i < uniqueCompanies.length - 1 && (
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 min-w-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function BentoCard({
  children,
  className = '',
  index,
}: {
  children: React.ReactNode;
  className?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        damping: 25,
        stiffness: 200,
        delay: index * 0.06,
      }}
      className={`bg-gray-100/80 dark:bg-white/[0.06] rounded-xl p-5 transition-transform transition-shadow duration-200 hover:-translate-y-0.5 hover:shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-gray-500 dark:text-gray-400">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Individual cards
// ---------------------------------------------------------------------------

function HeroCard() {
  return (
    <BentoCard
      index={0}
      className="col-span-2 border border-lime-500/20"
    >
      <div className="flex flex-col items-center text-center">
        <SlotCounter value={yearsOfExperience} size="lg" />
        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
          Years Building Products
        </p>
        <MiniTimeline />
      </div>
    </BentoCard>
  );
}

function SkillsCard() {
  const barShades = [
    'bg-gray-900 dark:bg-gray-100',
    'bg-gray-700 dark:bg-gray-300',
    'bg-gray-500 dark:bg-gray-400',
    'bg-gray-400 dark:bg-gray-500',
    'bg-gray-300 dark:bg-gray-600',
  ];

  return (
    <BentoCard index={1}>
      <div className="flex flex-col items-center text-center">
        <SlotCounter value={totalSkills} />
        <CardLabel>Technical Skills</CardLabel>
        <div className="flex w-full h-2 rounded-full overflow-hidden mt-3 gap-px">
          {skillCategories.map((cat, i) => (
            <BarSegment
              key={cat.key}
              label={cat.label}
              count={cat.count}
              percentage={(cat.count / totalSkills) * 100}
              shade={barShades[i]}
            />
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

function ProjectsCard() {
  return (
    <BentoCard index={2}>
      <div className="flex flex-col items-center text-center">
        <SlotCounter value={totalProjects} />
        <CardLabel>Shipped Projects</CardLabel>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          {topProjects.map((name) => (
            <span
              key={name}
              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-white/[0.08] text-gray-600 dark:text-gray-400"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

function CompaniesCard() {
  return (
    <BentoCard index={3}>
      <div className="flex flex-col items-center text-center">
        <SlotCounter value={companiesCount} />
        <CardLabel>Companies</CardLabel>
        <div className="flex flex-col items-center gap-0.5 mt-3">
          {uniqueCompanies.map((name) => (
            <span
              key={name}
              className="text-xs text-gray-400 dark:text-gray-500"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </BentoCard>
  );
}

function RecsCard() {
  return (
    <BentoCard index={4}>
      <div className="flex flex-col items-center text-center">
        <SlotCounter value={totalRecs} />
        <CardLabel>LinkedIn Recommendations</CardLabel>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 italic leading-relaxed">
          &ldquo;{firstRecSnippet}&rdquo;
        </p>
      </div>
    </BentoCard>
  );
}

function LanguagesCard() {
  return (
    <BentoCard index={5}>
      <div className="flex flex-col gap-2.5">
        <CardLabel>Languages</CardLabel>
        {config.languages.map((lang) => (
          <div key={lang.language} className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 w-16 shrink-0">
              {lang.language}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.08] overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  lang.level === 'Native'
                    ? 'w-full bg-lime-500'
                    : 'w-3/4 bg-gray-400 dark:bg-gray-500'
                }`}
              />
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 w-20 text-right shrink-0">
              {lang.level}
            </span>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}

function EducationCard() {
  const edu = config.education;

  return (
    <BentoCard index={6} className="col-span-2">
      <div className="flex gap-3">
        <div className="w-0.5 bg-lime-500/40 rounded-full shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
            {edu.university}
          </span>
          <span className="text-xs text-gray-700 dark:text-gray-300">
            {edu.degree}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {edu.period}
          </span>
        </div>
      </div>
    </BentoCard>
  );
}

// ---------------------------------------------------------------------------
// QuickFacts — bento grid
// ---------------------------------------------------------------------------

export default function QuickFacts() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
    >
      {/* Row 1: hero (2-col) + skills */}
      <HeroCard />
      <SkillsCard />

      {/* Row 2: projects, companies, recs */}
      <ProjectsCard />
      <CompaniesCard />
      <RecsCard />

      {/* Row 3: languages + education (2-col) */}
      <LanguagesCard />
      <EducationCard />
    </motion.div>
  );
}
