'use client';

import { motion } from 'framer-motion';

interface SuggestedChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export default function SuggestedChips({ questions, onSelect }: SuggestedChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center px-4">
      {questions.map((question, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelect(question)}
          className="px-4 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                     border border-gray-200 dark:border-gray-700 rounded-full text-sm
                     transition-colors duration-200"
        >
          {question}
        </motion.button>
      ))}
    </div>
  );
}
