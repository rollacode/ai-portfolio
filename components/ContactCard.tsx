'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import config from '@/data/config.json';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const socialIcons: Record<string, React.FC> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
  email: EmailIcon,
};

const socialLabels: Record<string, string> = {
  github: 'GitHub',
  linkedin: 'LinkedIn',
  email: 'Email',
};

export default function ContactCard() {
  const [copied, setCopied] = useState(false);

  const { name, bio, location, social } = config;

  const handleCopyEmail = async () => {
    if (!social.email) return;
    try {
      await navigator.clipboard.writeText(social.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing silently
    }
  };

  const socialEntries = Object.entries(social).filter(
    ([, value]) => value
  ) as [string, string][];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-5"
    >
      {/* Name & bio */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {name}
        </h3>
        {bio && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {bio}
          </p>
        )}
      </div>

      {/* Location */}
      {location && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <LocationIcon />
          <span>{location}</span>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-gray-100 dark:bg-neutral-800" />

      {/* Social links */}
      <div className="space-y-3">
        {socialEntries.map(([key, value]) => {
          const IconComponent = socialIcons[key] || LinkIcon;
          const label = socialLabels[key] || key;
          const isEmail = key === 'email';

          if (isEmail) {
            return (
              <button
                key={key}
                onClick={handleCopyEmail}
                className="group flex items-center gap-3 w-full text-left text-sm text-gray-700 dark:text-gray-300 hover:text-lime-500 dark:hover:text-lime-400 transition-colors"
              >
                <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-lime-500 dark:group-hover:text-lime-400 transition-colors">
                  <IconComponent />
                </span>
                <span className="truncate">{value}</span>
                <span className="ml-auto flex-shrink-0">
                  {copied ? (
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-green-500"
                    >
                      <CheckIcon />
                    </motion.span>
                  ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      copy
                    </span>
                  )}
                </span>
              </button>
            );
          }

          return (
            <a
              key={key}
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:text-lime-500 dark:hover:text-lime-400 transition-colors"
            >
              <span className="flex-shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-lime-500 dark:group-hover:text-lime-400 transition-colors">
                <IconComponent />
              </span>
              <span className="truncate">{label}</span>
            </a>
          );
        })}
      </div>
    </motion.div>
  );
}
