'use client';

import { motion, AnimatePresence } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MemoryBubbleProps {
  visitorMemory: Record<string, string>;
  newKeys: Set<string>;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'name',
  company: 'company',
  role: 'role',
  email: 'email',
  telegram: 'telegram',
  phone: 'phone',
  linkedin: 'linkedin',
  interest: 'interest',
  notes: 'note',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MemoryLine({ visitorMemory, newKeys }: MemoryBubbleProps) {
  const entries = Object.entries(visitorMemory)
    .filter(([key, val]) => val && FIELD_LABELS[key])
    .map(([key, val]) => ({ label: FIELD_LABELS[key], value: val, isNew: newKeys.has(key) }));

  if (entries.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-1.5 inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] text-gray-400 dark:text-gray-500 italic"
    >
      <span>remembered:</span>
      <AnimatePresence mode="popLayout">
        {entries.map((e, i) => (
          <motion.span
            key={e.label}
            initial={e.isNew ? { opacity: 0, scale: 0.95 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={e.isNew
              ? 'text-gray-600 dark:text-gray-300 not-italic'
              : 'text-gray-400 dark:text-gray-500'
            }
          >
            {e.value}{i < entries.length - 1 ? ' ·' : ''}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
