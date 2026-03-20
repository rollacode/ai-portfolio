// Thin wrapper: delegates to core, passes site-specific prompt template
import {
  buildSystemPrompt as coreBuildSystemPrompt,
  loadPortfolioContent as coreLoadPortfolioContent,
} from '@ai-portfolio/core/lib/system-prompt';
import { buildSystemPromptText } from '@/prompts/system';

export const loadPortfolioContent = () => coreLoadPortfolioContent();
export const buildSystemPrompt = () => coreBuildSystemPrompt(buildSystemPromptText);
