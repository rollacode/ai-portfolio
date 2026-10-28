// Thin wrapper: delegates to core, passes site-specific prompt template
import {
  buildSystemPrompt as coreBuildSystemPrompt,
  loadPortfolioContent as coreLoadPortfolioContent,
} from '@ai-portfolio/core/lib/system-prompt';
import { buildSystemPromptText } from '@/prompts/system';

export const loadPortfolioContent = () => coreLoadPortfolioContent();
// Chat alone uses compact project summaries. Panels and other consumers retain
// the complete portfolio through loadPortfolioContent() above.
export const buildSystemPrompt = (basePath?: string) => coreBuildSystemPrompt(buildSystemPromptText, basePath, {
  includeProjectWriteups: false,
  projectSummaryLines: 2,
});
