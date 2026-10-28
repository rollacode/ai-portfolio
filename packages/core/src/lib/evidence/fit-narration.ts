// Volatile, bounded coordination between the owned fit hook and receipt renderer.
// It keeps the one receipt batch behind the final fit commentary commit.
const settled = new Set<string>();
const listeners = new Set<() => void>();
export const subscribeFitNarration = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const isFitNarrationSettled = (requestId?: string) => !!requestId && settled.has(requestId);
export function settleFitNarration(requestId: string) {
  settled.add(requestId);
  if (settled.size > 100) settled.delete(settled.values().next().value!);
  listeners.forEach(listener => listener());
}

const reopened = new Map<string, string>();
export function suppressReopenedFitCommentary(description: string, requestId?: string) {
  if (!requestId) return;
  reopened.set(description, requestId);
  if (reopened.size > 16) reopened.delete(reopened.keys().next().value!);
}
export function takeReopenedFitSuppression(description: string, requestId?: string) {
  const originatingRequest = reopened.get(description);
  reopened.delete(description);
  return !!requestId && originatingRequest === requestId;
}
