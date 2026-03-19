'use client';

import ThemeToggle from './ThemeToggle';

export default function Toolbar() {
  const handleNewChat = () => {
    window.dispatchEvent(new Event('clear-chat'));
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleNewChat}
        className="p-2 rounded-xl bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm
                   border border-gray-200 dark:border-neutral-700
                   hover:bg-gray-50 dark:hover:bg-neutral-800
                   text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                   transition-colors shadow-sm"
        aria-label="New chat"
        title="New chat"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <ThemeToggle />
    </div>
  );
}
