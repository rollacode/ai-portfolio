// Showtime prompt builder — thin wrapper over prompts/showtime.ts

import { loadPortfolioContent } from './system-prompt';
import { buildShowtimePromptText } from '@/prompts/showtime';

export function buildShowtimePrompt(
  topic: string,
  intent?: string,
  language?: string,
): string {
  const portfolioContent = loadPortfolioContent();
  return buildShowtimePromptText({ topic, intent, language, portfolioContent });
}
