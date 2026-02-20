'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import skillsData from '@/portfolio/skills.json';

type SkillLevel = 'expert' | 'professional' | 'familiar';

interface Skill {
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
  professional: 'bg-blue-500',
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
}

export default function SkillsGrid({
  category,
  highlightedSkill,
  onHighlightConsumed,
}: SkillsGridProps) {
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
                      className={`
                        relative flex items-center gap-3 px-4 py-3
                        bg-gray-50 dark:bg-neutral-900 rounded-xl
                        border border-transparent
                        transition-all duration-300
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
