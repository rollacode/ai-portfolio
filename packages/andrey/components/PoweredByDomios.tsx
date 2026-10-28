'use client';

import { motion } from 'framer-motion';

// The Domios Threshold mark and its brand spring (mass 1, stiffness 420, damping 22).
const THRESHOLD = 'M8 8H32C46 8 56 18 56 32S46 56 32 56H24L40 40V24H24V40L8 56Z';
const give = { type: 'spring' as const, stiffness: 420, damping: 22, mass: 1 };

/** A quiet signature in the line under the input: names what this site runs on and leads to it. */
export default function PoweredByDomios() {
  return (
    <motion.a
      href="https://domios.dev"
      target="_blank"
      rel="noopener noreferrer"
      initial="rest"
      animate="rest"
      whileHover="hover"
      whileTap="press"
      className="domios-credit group inline-flex items-center gap-[5px] rounded-sm align-[-1px] hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:hover:text-gray-100"
    >
      {/* The wrapper owns the CSS entrance so the spring keeps the svg's transform. */}
      <span className="domios-credit__mark inline-flex">
        <motion.svg
          viewBox="0 0 64 64"
          className="h-[11px] w-[11px] text-lime-600 dark:text-lime-400"
          aria-hidden="true"
          variants={{ rest: { rotate: 0, scale: 1 }, hover: { rotate: -8, scale: 1.22 }, press: { scaleX: 0.85, scaleY: 1.12 } }}
          transition={give}
        >
          <path d={THRESHOLD} fill="currentColor" fillRule="evenodd" />
        </motion.svg>
      </span>
      <span>
        Powered by{' '}
        <span className="font-semibold text-gray-600 transition-colors group-hover:text-lime-600 dark:text-gray-300 dark:group-hover:text-lime-400">
          Domios
        </span>
      </span>
    </motion.a>
  );
}
