'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { useConversationContext } from '../../context/ConversationContext';
import { liquidSettle, reducedMotionCrossfade } from '../../lib/motion';

type SkillLevel = 'expert' | 'professional' | 'familiar';

interface Skill {
  id: string;
  name: string;
  years?: number;
  level: SkillLevel;
}

type Category = 'primary' | 'strong' | 'ai' | 'working' | 'hobby';

const categoryLabels: Record<Category, string> = {
  primary: 'Primary (Expert)',
  strong: 'Strong (Professional)',
  ai: 'AI / LLM Tooling',
  working: 'Working Knowledge',
  hobby: 'Hobby / Side Projects',
};

const levelColors: Record<SkillLevel, string> = {
  expert: 'bg-green-500',
  professional: 'bg-lime-500',
  familiar: 'bg-yellow-500',
};

const levelLabels: Record<SkillLevel, string> = {
  expert: 'Expert',
  professional: 'Professional',
  familiar: 'Familiar',
};

interface SkillsGridProps {
  category?: string;
  highlightedSkill?: string | null;
  onHighlightConsumed?: () => void;
  onSkillClick?: (skillName: string) => void;
  onProjectOpen?: (slug: string) => void;
}

function LegacySkillsGrid({
  category,
  highlightedSkill,
  onHighlightConsumed,
  onSkillClick,
}: SkillsGridProps) {
  const { skills: skillsData } = usePortfolioData();
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (highlightedSkill) {
      setActiveHighlight(highlightedSkill);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }

      highlightTimerRef.current = setTimeout(() => {
        setActiveHighlight(null);
        onHighlightConsumed?.();
        highlightTimerRef.current = null;
      }, 2500);
    }

    return () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    };
  }, [highlightedSkill, onHighlightConsumed]);

  const categories = (
    !category || category === 'all'
      ? Object.keys(skillsData)
      : [category]
  ).filter((c) => c in skillsData) as Category[];

  let globalIndex = 0;

  return (
    <div className="space-y-8">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
        {Object.entries(levelColors).map(([level, color]) => (
          <span key={level} className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
            {levelLabels[level as SkillLevel]}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {categories.map((cat) => {
          const skills = (skillsData as Record<Category, Skill[]>)[cat];
          const sectionStartIndex = globalIndex;

          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-lime-500 whitespace-nowrap">
                  {categoryLabels[cat]}
                </h3>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              </div>

              {/* Skills grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {skills.map((skill, idx) => {
                  const itemIndex = sectionStartIndex + idx;
                  globalIndex = itemIndex + 1;
                  const isHighlighted =
                    activeHighlight &&
                    skill.name
                      .toLowerCase()
                      .includes(activeHighlight.toLowerCase());

                  return (
                    <motion.div
                      key={skill.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: itemIndex * 0.04,
                        duration: 0.3,
                        ease: 'easeOut',
                      }}
                      onClick={() => onSkillClick?.(skill.name)}
                      className={`
                        relative flex items-center gap-3 px-4 py-3
                        bg-gray-50 dark:bg-neutral-900 rounded-xl
                        border border-transparent
                        transition-all duration-300
                        ${onSkillClick ? 'cursor-pointer active:scale-[0.98]' : ''}
                        ${
                          isHighlighted
                            ? 'border-lime-500/60 shadow-[0_0_16px_rgba(132,204,22,0.25)]'
                            : 'hover:border-gray-200 dark:hover:border-neutral-700'
                        }
                      `}
                    >
                      {/* Pulse animation for highlighted skill */}
                      {isHighlighted && (
                        <motion.div
                          className="absolute inset-0 rounded-xl border-2 border-lime-500/40"
                          initial={{ opacity: 1 }}
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      )}

                      {/* Level dot */}
                      <span
                        className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${levelColors[skill.level]}`}
                        title={levelLabels[skill.level]}
                      />

                      {/* Skill info */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate block">
                          {skill.name}
                        </span>
                      </div>

                      {/* Years badge */}
                      {skill.years && (
                        <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {skill.years}y
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function SkillProjects({ skillId, onProjectOpen }: { skillId: string | null; onProjectOpen?: (slug: string) => void }) {
  const { projects, skills } = usePortfolioData();
  const still = useReducedMotion();
  const skill = Object.values(skills).flat().find(item => item.id === skillId);
  const linked = projects.filter(project => skillId && project.skillIds?.includes(skillId));
  return <div className="min-h-32 rounded-[14px_18px_14px_18px] border border-gray-200 p-4 dark:border-gray-800" aria-live="polite">
    <h3 className="font-semibold">{skill ? skill.name + ' in practice' : 'Explore the project connections'}</h3>
    {!skill ? <p className="mt-2 text-sm text-gray-500">Select a skill with a tap, keyboard focus or pointer.</p> : <>
      <svg viewBox="0 0 200 12" className="my-3 h-3 w-full text-lime-500" aria-hidden="true"><motion.path key={skillId} d="M0 6 H200" stroke="currentColor" strokeWidth="2" initial={still ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={still ? reducedMotionCrossfade : liquidSettle} /></svg>
      {linked.length ? <ul className="space-y-2">{linked.map(project => <li key={project.slug}>{onProjectOpen ? <button id={'skill-project-' + skillId + '-' + project.slug} type="button" className="rounded text-left text-sm underline decoration-lime-500 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500" onClick={() => onProjectOpen(project.slug)}>{project.name}</button> : <span className="text-sm">{project.name}</span>}</li>)}</ul> : <p className="text-sm text-gray-500">No portfolio project is linked to this skill yet.</p>}
    </>}
  </div>;
}

function LivingSkillsGrid({ category, highlightedSkill, onHighlightConsumed, onSkillClick, onProjectOpen }: SkillsGridProps) {
  const { skills } = usePortfolioData();
  const [selected, setSelected] = useState<string | null>(null);
  const categories = (Object.keys(categoryLabels) as Category[]).filter(key => !category || category === 'all' || category === key);
  useEffect(() => {
    if (!highlightedSkill) return;
    const match = Object.values(skills).flat().find(skill => skill.name.toLowerCase().includes(highlightedSkill.toLowerCase()));
    setSelected(match?.id || null);
    onHighlightConsumed?.();
  }, [highlightedSkill, onHighlightConsumed, skills]);
  return <div className="space-y-6">
    {!categories.length && <p role="status">No skills match this category. Ask to show all skills.</p>}
    <div className="space-y-6">
      {categories.map(category => <section key={category} aria-label={categoryLabels[category]}>
        <h3 className="mb-3 text-lg font-semibold">{categoryLabels[category]}</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {skills[category].map(skill => <button id={'skill-source-' + skill.id} key={skill.id} type="button" aria-pressed={selected === skill.id}
            onPointerEnter={() => setSelected(skill.id)} onFocus={() => setSelected(skill.id)}
            onClick={() => { setSelected(skill.id); onSkillClick?.(skill.name); }}
            className={'flex items-center justify-between gap-3 rounded-[10px_16px_10px_16px] border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 ' + (selected === skill.id ? 'border-lime-500 bg-lime-500/10' : 'border-transparent bg-gray-50 dark:bg-gray-900')}>
            <span className="text-sm font-medium">{skill.name}</span><span className="text-xs text-gray-500">{levelLabels[skill.level as SkillLevel] || skill.level}{skill.years ? ' (' + skill.years + 'y)' : ''}</span>
          </button>)}
        </div>
      </section>)}
    </div>
    <SkillProjects skillId={selected} onProjectOpen={onProjectOpen} />
    {selected && <button type="button" className="text-sm underline" onClick={() => setSelected(null)}>Clear selection</button>}
  </div>;
}

export default function SkillsGrid(props: SkillsGridProps) {
  const { enabled } = useConversationContext();
  return enabled ? <LivingSkillsGrid {...props} /> : <LegacySkillsGrid {...props} />;
}
