// Showtime prompt builder — core version
// Accepts a prompt builder function instead of importing from @/prompts/

import { loadPortfolioContent } from './system-prompt';

/**
 * Build the showtime prompt. Requires a promptBuilder function since prompt
 * templates live in each site package, not in core.
 *
 * @param promptBuilder - function that takes showtime params and returns the final prompt string
 * @param topic - the story topic
 * @param intent - what the audience wants to learn
 * @param language - language for the narrative
 * @param basePath - optional base path for portfolio data (defaults to process.cwd())
 */
export function buildShowtimePrompt(
  promptBuilder: (params: {
    topic: string;
    intent?: string;
    language?: string;
    portfolioContent: string;
  }) => string,
  topic: string,
  intent?: string,
  language?: string,
  basePath?: string,
): string {
  const portfolioContent = loadPortfolioContent(basePath);
  return promptBuilder({ topic, intent, language, portfolioContent });
}
