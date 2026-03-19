'use client';

import { useState, useRef, useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';

// ---------------------------------------------------------------------------
// Static data (not dependent on portfolio data)
// ---------------------------------------------------------------------------

const industries = [
  { name: 'AI/ML', project: 'REKAP' },
  { name: 'Retail & AR', project: 'Trax, Scan Mania' },
  { name: 'Healthcare', project: 'SOS Portal' },
  { name: 'People Analytics', project: 'Performica' },
  { name: 'Dev Tools', project: 'Bugsee' },
  { name: 'Wellness', project: 'Binaura' },
  { name: 'ESG', project: 'EcoIQ' },
  { name: 'Entertainment', project: 'Minnow, Cops Inc.' },
  { name: 'Food Tech', project: 'Dishero' },
];

const spring = { type: 'spring' as const, damping: 25, stiffness: 200 };

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
      ? 'text-4xl font-mono font-bold text-gray-900 dark:text-white'
      : 'text-3xl font-mono font-bold text-gray-900 dark:text-white';

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
  suffix,
}: {
  value: number;
  size?: 'lg' | 'sm';
  suffix?: string;
}) {
  const digits = String(value).split('').map(Number);
  const suffixClass =
    size === 'lg'
      ? 'text-4xl font-mono font-bold text-gray-900 dark:text-white'
      : 'text-3xl font-mono font-bold text-gray-900 dark:text-white';

  return (
    <div className="flex items-center">
      {digits.map((d, i) => (
        <SlotDigit key={i} digit={d} delay={i * 0.05} size={size} />
      ))}
      {suffix && <span className={suffixClass}>{suffix}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar segment with tooltip
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
// Expand indicator chevron
// ---------------------------------------------------------------------------

function ExpandChevron({ expanded }: { expanded: boolean }) {
  return (
    <motion.svg
      animate={{ rotate: expanded ? 180 : 0 }}
      transition={spring}
      className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover/card:text-lime-500 transition-colors"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </motion.svg>
  );
}

// ---------------------------------------------------------------------------
// BentoCard wrapper with glow, spotlight, expand
// ---------------------------------------------------------------------------

type CardId = 'hero' | 'led17' | 'sideproject' | 'skills' | 'industries' | 'projects' | 'education';

function BentoCard({
  id,
  children,
  expandedContent,
  className = '',
  index,
  expandedId,
  onToggleExpand,
  hoveredId,
  onHover,
  onLeave,
}: {
  id: CardId;
  children: React.ReactNode;
  expandedContent?: React.ReactNode;
  className?: string;
  index: number;
  expandedId: CardId | null;
  onToggleExpand: (id: CardId) => void;
  hoveredId: CardId | null;
  onHover: (id: CardId) => void;
  onLeave: () => void;
}) {
  const isExpanded = expandedId === id;
  const isExpandable = !!expandedContent;
  const dimmed = hoveredId !== null && hoveredId !== id;

  return (
    <motion.div
      layout
      data-bento-card=""
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: dimmed ? 0.5 : 1,
        y: 0,
      }}
      transition={{
        ...spring,
        delay: index * 0.06,
        opacity: { duration: 0.3 },
      }}
      className={`group/card relative bg-gray-100/80 dark:bg-white/[0.06] rounded-xl p-5 overflow-hidden ${
        isExpandable ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={() => isExpandable && onToggleExpand(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={onLeave}
    >
      {/* Cursor glow overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 md:opacity-100 transition-opacity"
        style={{
          background:
            'radial-gradient(200px circle at var(--glow-x, -200px) var(--glow-y, -200px), rgba(132, 204, 22, 0.06), transparent)',
        }}
      />

      {/* Expand indicator */}
      {isExpandable && (
        <div className="absolute top-3 right-3">
          <ExpandChevron expanded={isExpanded} />
        </div>
      )}

      <div className="relative z-[1]">
        {children}
        <AnimatePresence>
          {isExpanded && expandedContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ ...spring, opacity: { duration: 0.2, delay: 0.1 } }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-gray-200/60 dark:border-white/[0.06]">
                {expandedContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// QuickFacts — Highlight Reel bento grid
// ---------------------------------------------------------------------------

export default function QuickFacts() {
  const { config, projects, skills, experience } = usePortfolioData();

  // Computed data from portfolio context
  const skillCategories = useMemo(() => [
    { key: 'primary' as const, label: 'Expert', count: (skills as any).primary?.length ?? 0 },
    { key: 'strong' as const, label: 'Strong', count: (skills as any).strong?.length ?? 0 },
    { key: 'ai' as const, label: 'AI', count: (skills as any).ai?.length ?? 0 },
    { key: 'working' as const, label: 'Working', count: (skills as any).working?.length ?? 0 },
    { key: 'hobby' as const, label: 'Hobby', count: (skills as any).hobby?.length ?? 0 },
  ], [skills]);

  const totalSkills = useMemo(() => skillCategories.reduce((sum, c) => sum + c.count, 0), [skillCategories]);

  const yearsOfExperience = useMemo(() => {
    const startYears = (experience as any[]).map((e: any) => {
      const match = e.period.match(/\b(19|20)\d{2}\b/);
      return match ? parseInt(match[0], 10) : Infinity;
    });
    const earliestYear = Math.min(...startYears);
    return new Date().getFullYear() - earliestYear;
  }, [experience]);

  const uniqueCompanies = useMemo(() => [...new Set((experience as any[]).map((e: any) => e.company))], [experience]);

  const totalProjects = (projects as any[]).length;

  const skillsByCategory = useMemo(() => ({
    Expert: ((skills as any).primary ?? []).map((s: any) => s.name),
    Strong: ((skills as any).strong ?? []).map((s: any) => s.name),
    AI: ((skills as any).ai ?? []).map((s: any) => s.name),
    Working: ((skills as any).working ?? []).map((s: any) => s.name),
    Hobby: ((skills as any).hobby ?? []).map((s: any) => s.name),
  }), [skills]);

  const companyRoles = useMemo(() => (experience as any[]).map((e: any) => ({
    company: e.company,
    role: e.role,
    period: e.period,
  })), [experience]);

  const allProjects = useMemo(() => (projects as any[]).map((p: any) => ({
    name: p.name.split(' - ')[0],
    period: p.period,
  })), [projects]);

  const topProjectNames = useMemo(() => (projects as any[]).slice(0, 5).map((p: any) => p.name.split(' - ')[0]), [projects]);

  const gridRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<CardId | null>(null);
  const [hoveredId, setHoveredId] = useState<CardId | null>(null);

  const handleToggleExpand = useCallback((id: CardId) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleHover = useCallback((id: CardId) => {
    setHoveredId(id);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const handleMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = grid.querySelectorAll<HTMLElement>('[data-bento-card]');
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--glow-x', `${x}px`);
      card.style.setProperty('--glow-y', `${y}px`);
    });
  }, []);

  const barShades = [
    'bg-gray-900 dark:bg-gray-100',
    'bg-gray-700 dark:bg-gray-300',
    'bg-gray-500 dark:bg-gray-400',
    'bg-gray-400 dark:bg-gray-500',
    'bg-gray-300 dark:bg-gray-600',
  ];

  const edu = (config as any).education;

  const cardProps = {
    expandedId,
    onToggleExpand: handleToggleExpand,
    hoveredId,
    onHover: handleHover,
    onLeave: handleLeave,
  };

  return (
    <motion.div
      ref={gridRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      onMouseMove={handleMouseMove}
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
    >
      {/* Row 1: Hero (2-col) + Skills */}
      <BentoCard
        id="hero"
        index={0}
        className="col-span-2 ring-1 ring-lime-500/20"
        expandedContent={
          <div className="space-y-2">
            {companyRoles.map((cr) => (
              <div key={cr.company} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{cr.company}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cr.role}</p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{cr.period}</span>
              </div>
            ))}
          </div>
        }
        {...cardProps}
      >
        <div className="flex flex-col items-center text-center">
          <SlotCounter value={yearsOfExperience} size="lg" suffix="+" />
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Years Building Products</p>
          <div className="flex items-center gap-0 w-full mt-3">
            {uniqueCompanies.map((company, i) => (
              <div key={company} className="flex items-center group flex-1 min-w-0">
                <div className="relative flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 group-hover:bg-lime-500 transition-colors shrink-0" />
                  <span className="absolute top-3 text-[9px] text-gray-400 dark:text-gray-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">{company}</span>
                </div>
                {i < uniqueCompanies.length - 1 && <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 min-w-1" />}
              </div>
            ))}
          </div>
        </div>
      </BentoCard>

      <BentoCard
        id="skills"
        index={1}
        expandedContent={
          <div className="space-y-3">
            {skillCategories.map((cat) => (
              <div key={cat.key}>
                <p className="text-xs font-medium text-gray-900 dark:text-gray-50 mb-1">{cat.label} ({cat.count})</p>
                <div className="flex flex-wrap gap-1">
                  {(skillsByCategory as Record<string, string[]>)[cat.label]?.map((name) => (
                    <span key={name} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-300">{name}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        }
        {...cardProps}
      >
        <div className="flex flex-col items-center text-center">
          <SlotCounter value={totalSkills} suffix="+" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Technical Skills</p>
          <div className="flex w-full h-2 rounded-full overflow-hidden mt-3 gap-px">
            {skillCategories.map((cat, i) => (
              <BarSegment key={cat.key} label={cat.label} count={cat.count} percentage={(cat.count / totalSkills) * 100} shade={barShades[i]} />
            ))}
          </div>
        </div>
      </BentoCard>

      {/* Row 2: Led17, Side Project, Industries */}
      <BentoCard
        id="led17"
        index={2}
        expandedContent={
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p className="font-medium text-gray-900 dark:text-gray-50">SOS Portal</p>
            <p>Built a complete teleconsultation platform in 6 months during the pandemic peak. Managed a cross-functional team spanning DevOps, mobile, web, backend, design, and QA.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Mar 2020 - Oct 2020</p>
          </div>
        }
        {...cardProps}
      >
        <div className="flex flex-col items-center text-center">
          <SlotCounter value={17} />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Engineers led during COVID</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Teleconsultation platform, deployed in Brazil</p>
        </div>
      </BentoCard>

      <BentoCard
        id="sideproject"
        index={3}
        expandedContent={
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>iOS app for sleep improvement and sound therapy. Built with Swift, SwiftUI, StoreKit 2, CloudKit. Organic growth, featured on App Store multiple times.</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['Swift', 'SwiftUI', 'StoreKit 2', 'Firebase', 'Next.js'].map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-300">{t}</span>
              ))}
            </div>
          </div>
        }
        {...cardProps}
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-xl font-bold text-gray-900 dark:text-white">Binaura</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Founder &amp; Developer</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Sleep &amp; sound therapy app, App Store featured</p>
        </div>
      </BentoCard>

      <BentoCard
        id="industries"
        index={4}
        expandedContent={
          <div className="space-y-1.5">
            {industries.map((ind) => (
              <div key={ind.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-gray-50">{ind.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{ind.project}</span>
              </div>
            ))}
          </div>
        }
        {...cardProps}
      >
        <div className="flex flex-col items-center text-center">
          <SlotCounter value={industries.length} />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Industries Shipped In</p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {industries.map((ind) => (
              <span key={ind.name} className="text-xs px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-300">{ind.name}</span>
            ))}
          </div>
        </div>
      </BentoCard>

      {/* Row 3: Projects + Education (2-col) */}
      <BentoCard
        id="projects"
        index={5}
        expandedContent={
          <div className="space-y-1.5">
            {allProjects.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-gray-50 truncate mr-2">{p.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{p.period}</span>
              </div>
            ))}
          </div>
        }
        {...cardProps}
      >
        <div className="flex flex-col items-center text-center">
          <SlotCounter value={totalProjects} suffix="+" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Shipped Projects</p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {topProjectNames.map((name) => (
              <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-300">{name}</span>
            ))}
          </div>
        </div>
      </BentoCard>

      <BentoCard
        id="education"
        index={6}
        className="col-span-2"
        {...cardProps}
      >
        <div className="flex gap-3">
          <div className="w-0.5 bg-lime-500/40 rounded-full shrink-0" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{edu?.university}</span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{edu?.degree}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">{edu?.period}</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {(config as any).languages?.map((lang: any) => (
                <span key={lang.language} className="text-xs text-gray-500 dark:text-gray-400">
                  {lang.language} ({lang.level === 'Native' ? 'Native' : 'Professional'})
                </span>
              ))}
            </div>
          </div>
        </div>
      </BentoCard>
    </motion.div>
  );
}
