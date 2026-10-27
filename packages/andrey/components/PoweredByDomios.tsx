'use client';

import { motion } from 'framer-motion';

// The Domios Threshold mark and its brand spring (mass 1, stiffness 420, damping 22).
const THRESHOLD = 'M8 8H32C46 8 56 18 56 32S46 56 32 56H24L40 40V24H24V40L8 56Z';
const give = { type: 'spring' as const, stiffness: 420, damping: 22, mass: 1 };

/** A quiet signature that names what this site runs on and leads to it. */
export default function PoweredByDomios() {
  return (
    <motion.a
      href="https://domios.dev"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Powered by Domios, open domios.dev"
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="press"
      variants={{ rest: { y: 0, scaleX: 1, scaleY: 1 }, hover: { y: -2, scaleX: 1.035, scaleY: 1.02 }, press: { scaleX: 0.965, scaleY: 0.95 } }}
      transition={give}
      className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 py-1.5 pl-2 pr-3 text-[11px] text-gray-500 shadow-sm backdrop-blur-md hover:border-lime-500/50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-500 dark:border-gray-800 dark:bg-gray-950/80 dark:text-gray-400 dark:hover:text-gray-100"
    >
      <motion.svg
        viewBox="0 0 64 64"
        className="h-4 w-4 text-lime-600 dark:text-lime-400"
        aria-hidden="true"
        variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -6, scale: 1.12 }, press: { scaleX: 0.88, scaleY: 1.1 } }}
        transition={give}
      >
        <path d={THRESHOLD} fill="currentColor" fillRule="evenodd" />
      </motion.svg>
      <span>
        Powered by <span className="font-semibold text-gray-900 dark:text-gray-100">Domios</span>
      </span>
    </motion.a>
  );
}
