import { tools } from './tools';
import { useSyncExternalStore } from 'react';
import type { Message } from '../hooks/types';
import type { PanelState } from './tool-handler';
import { parseClassification, type Classification, type PanelIdentity, type PendingTool } from './conversation-events';
export type { Classification, PanelIdentity, PendingTool } from './conversation-events';

const motionQuery = '(prefers-reduced-motion: reduce)';
function reducedSnapshot() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(motionQuery).matches;
}
function subscribeMotion(update: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
}
/** Respond to preference changes as well as the initial device setting. */
export function useChatReducedMotion() {
  return useSyncExternalStore(subscribeMotion, reducedSnapshot, () => false);
}

// Structural adapters to the frozen runtime contract; never persisted.
const panelNames: Record<string, NonNullable<PanelState['type']>> = {
  show_project: 'project', show_projects: 'projects', show_skills: 'skills',
  show_contact: 'contact', show_timeline: 'timeline', show_gallery: 'gallery',
  show_resume: 'resume', show_tech_radar: 'tech-radar', show_quick_facts: 'quick-facts',
  show_recommendations: 'recommendations', show_spotlight: 'spotlight',
  show_insight: 'insight', match_job: 'job-match', compare_projects: 'comparison',
};
const intentLabels: Record<string, string> = {
  projects: 'Looking through projects', project: 'Looking through projects',
  skills: 'Looking through skills', experience: 'Looking through experience',
  timeline: 'Looking through experience', contact: 'Finding contact details',
  job_match: 'Preparing the role comparison', match: 'Preparing the role comparison',
  resume: 'Preparing the résumé', recommendations: 'Finding recommendations',
};
export function loadingLabel(classification?: Classification, toolName?: string): string {
  if (classification?.available && intentLabels[classification.intent]) return intentLabels[classification.intent];
  const panel = toolName && panelNames[toolName];
  return panel ? `Opening ${panel.replace(/-/g, ' ')}` : 'Waiting for a response';
}
export function relevantContact(classification?: Classification): boolean {
  const score = classification?.leadScore;
  return classification?.available === true && typeof score === 'number'
    && Number.isFinite(score) && score >= 2.5 && score <= 4;
}
export function validToolArguments(name: string, value: unknown, projectSlugs?: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const schema = tools.find(t => t.function.name === name)?.function.parameters;
  if (!schema) return false;
  const args = value as Record<string, unknown>;
  if (schema.required?.some(key => !(key in args))) return false;
  for (const [key, item] of Object.entries(args)) {
    const property = schema.properties[key];
    if (!property || typeof item !== property.type) return false;
    if (typeof item === 'string' && (!item.trim() || (property.enum && !property.enum.includes(item)))) return false;
    if (typeof item === 'number' && (!Number.isFinite(item) || item < 0 || !Number.isInteger(item))) return false;
    if (projectSlugs && ['slug', 'slug1', 'slug2'].includes(key) && !projectSlugs.includes(item as string)) return false;
  }
  return true;
}
export function retryHistory(messages: Message[]): Message[] | null {
  let lastUser = messages.length - 1;
  while (lastUser >= 0 && messages[lastUser].role !== 'user') lastUser--;
  return lastUser < 0 ? null : messages.slice(0, lastUser + 1);
}
export class ChatLifecycle {
  requestId?: string;
  status: 'idle' | 'loading' | 'complete' | 'error' = 'idle';
  classification?: Classification;
  pendingTool?: PendingTool;
  toolName?: string;
  identity: PanelIdentity = { type: null, generation: 0 };
  private dispatched = new Set<string>();
  private commentary = new Set<string>();
  private generation = 0;
  begin(id: string) {
    this.requestId = id;
    this.status = 'loading';
    this.classification = undefined;
    this.pendingTool = undefined;
    this.toolName = undefined;
    this.dispatched.clear();
  }
  current(id: string) { return id === this.requestId && this.status === 'loading'; }
  classify(id: string, value: Classification) {
    if (!this.current(id)) return false;
    const parsed = parseClassification(value);
    if (!parsed) return false;
    this.classification = parsed;
    return true;
  }
  startTool(requestId: string, id: string, name: string) {
    if (!this.current(requestId) || this.dispatched.has(id)) return false;
    this.toolName = name;
    const panelType = panelNames[name];
    if (!panelType) return false;
    this.pendingTool = { id, name, panelType, generation: ++this.generation };
    return true;
  }
  dispatch(requestId: string, id: string, name: string, args: unknown, slugs?: readonly string[]) {
    if (!this.current(requestId) || this.dispatched.has(id)) return false;
    this.dispatched.add(id);
    if (this.pendingTool?.id === id) this.pendingTool = undefined;
    return validToolArguments(name, args, slugs);
  }
  panel(state: PanelState, force = false) {
    const type = state.open ? state.type : null;
    if (force || type !== this.identity.type || state.slug !== this.identity.slug) {
      this.identity = { type, slug: state.slug, generation: ++this.generation };
      return true;
    }
    return false;
  }
  fitCommentary(id: string, text: string) {
    if (id !== this.requestId || this.status === 'error' || this.status === 'idle' || !text.trim() || this.commentary.has(id)) return false;
    this.commentary.add(id);
    return true;
  }
  dismissPending() {
    if (this.pendingTool) this.dispatched.add(this.pendingTool.id);
    this.pendingTool = undefined;
  }
  finish(id: string, failed = false) {
    if (!this.current(id)) return;
    this.status = failed ? 'error' : 'complete';
    this.pendingTool = undefined;
    this.toolName = undefined;
  }
  reset() {
    this.requestId = undefined;
    this.status = 'idle';
    this.classification = undefined;
    this.pendingTool = undefined;
    this.toolName = undefined;
    this.identity = { type: null, generation: ++this.generation };
    this.dispatched.clear();
    this.commentary.clear();
  }
}
