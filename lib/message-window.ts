/**
 * Sliding window for chat message history.
 *
 * Trims the conversation to the most recent MAX_MESSAGES entries so that
 * long conversations don't blow past the provider's context window.
 *
 * The system prompt is prepended separately in the route, so this function
 * only operates on user / assistant / tool messages from the client.
 */

const MAX_MESSAGES = 40; // ~40 turns ≈ 80k tokens typical

export function trimMessages<
  T extends { role: string; content: string | null },
>(messages: T[]): T[] {
  if (messages.length <= MAX_MESSAGES) return messages;

  // If the client somehow sent a system message first, preserve it.
  const hasSystem = messages[0]?.role === 'system';
  const system = hasSystem ? [messages[0]] : [];
  const recent = messages.slice(-MAX_MESSAGES);

  return [...system, ...recent];
}
