/** WHAT: Independent trace oracle; WHY: implementations must not grade themselves.
 * ORACLE: ordered parsed calls, original arguments and conservative text checks.
 * Passing heuristics require human grounding review; they are not semantic proof.
 */
export type TraceEvent = { type: string; name?: string; arguments?: Record<string, unknown>; content?: string; message?: string; atMs?: number };
export type ToolRule = { name?: string; arguments?: Record<string, unknown>; argumentPatterns?: Record<string, string>; oneOf?: ToolRule[] };
export type EvalCase = {
  id: string; input: string; history: {role: string; content: string}[];
  requiredTools: ToolRule[]; firstSubstantiveTool: string | null; allowedPanels: string[] | null;
  forbiddenTools: string[]; requiredText: string[]; forbiddenText: string[];
  maxWords: number | null; originalDescription?: boolean; singlePanel?: boolean; checkedContactLinksOnly?: boolean;
};
export const panels = new Set(['show_project','show_projects','show_skills','show_contact','show_timeline','show_gallery','show_resume','show_tech_radar','focus_radar_section','show_quick_facts','show_spotlight','show_recommendations','show_insight','match_job','play_game','compare_projects','hide_panel','start_showtime']);
function matches(event: TraceEvent, rule: ToolRule): boolean {
  if (rule.oneOf) return rule.oneOf.some(r => matches(event, r));
  return event.type === 'tool_call' && event.name === rule.name &&
    Object.entries(rule.arguments ?? {}).every(([k,v]) => event.arguments?.[k] === v) &&
    Object.entries(rule.argumentPatterns ?? {}).every(([k,v]) => new RegExp(v,'i').test(String(event.arguments?.[k] ?? '')));
}
export function gradeTrace(c: EvalCase, events: TraceEvent[], contactLinks: string[] = []) {
  const failures: string[] = [];
  const calls = events.filter(e => e.type === 'tool_call');
  const text = events.filter(e => e.type === 'text').map(e => e.content ?? '').join('');
  let cursor = 0;
  for (const rule of c.requiredTools) {
    const index = calls.findIndex((e,i) => i >= cursor && matches(e,rule));
    if (index < 0) failures.push(`missing tool/arguments or order: ${JSON.stringify(rule)}`);
    else cursor = index + 1;
  }
  const substantive = events.find(e => e.type === 'tool_call' || (e.type === 'text' && e.content?.trim()));
  if (c.firstSubstantiveTool && (substantive?.type !== 'tool_call' || substantive.name !== c.firstSubstantiveTool)) failures.push(`first substantive action must be ${c.firstSubstantiveTool}`);
  for (const e of calls) {
    if (c.forbiddenTools.includes(e.name!)) failures.push(`forbidden tool: ${e.name}`);
    if (c.allowedPanels && panels.has(e.name!) && !c.allowedPanels.includes(e.name!)) failures.push(`competing panel: ${e.name}`);
  }
  if (c.singlePanel && calls.filter(e => panels.has(e.name!)).length !== 1) failures.push('exactly one panel call required');
  if (c.originalDescription && calls.find(e => e.name === 'match_job')?.arguments?.description !== c.input) failures.push('original full job description changed');
  for (const pattern of c.requiredText) if (!new RegExp(pattern,'iu').test(text)) failures.push(`missing text evidence: ${pattern}`);
  for (const pattern of c.forbiddenText) if (new RegExp(pattern,'iu').test(text)) failures.push(`forbidden claim: ${pattern}`);
  if (!text.trim() && !calls.length) failures.push('empty response');
  if (c.maxWords && text.trim().split(/\s+/).length > c.maxWords) failures.push('greeting too long');
  if (c.checkedContactLinksOnly) {
    const links = text.match(/https?:\/\/[^\s)\]>]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [];
    for (const link of links) if (!contactLinks.includes(link.replace(/[.,;]+$/,''))) failures.push(`unchecked contact link: ${link}`);
  }
  for (const e of events.filter(e => e.type === 'error')) failures.push(`transport: ${e.message ?? 'error'}`);
  return {pass: failures.length === 0, failures, text, toolCount: calls.length};
}

/** Raw usage-only frames are observed independently of the production parser. */
export function observeFrame(frame: any) {
  const d = frame.choices?.[0]?.delta;
  return {
    model: typeof frame.model === 'string' ? frame.model : undefined,
    toolNames: (d?.tool_calls ?? []).map((t: any) => t.function?.name).filter(Boolean) as string[],
    usage: frame.usage ?? undefined,
    cachedTokens: typeof frame.usage?.prompt_tokens_details?.cached_tokens === 'number' ? frame.usage.prompt_tokens_details.cached_tokens : null,
  };
}
export function requestBody<T extends Record<string, unknown>>(body: T, effort?: string) {
  return {...body, stream_options: {include_usage:true}, ...(effort ? {reasoning_effort:effort} : {})};
}
export function distribution(values: (number | null | undefined)[]) {
  const sorted = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v)).sort((a,b)=>a-b);
  const p = (fraction: number) => sorted.length ? sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)] : null;
  return {count:sorted.length, unknown:values.length-sorted.length, median:p(.5),p95:p(.95)};
}

/** Canonical-model estimate; returned billed ticks are preferred when available.
 * xAI can count reasoning separately from completion_tokens; total_tokens retains it.
 */
export function estimateRoundUsd(models: string[], usage: any): number | null {
  const cached = usage?.prompt_tokens_details?.cached_tokens;
  if (!models.length || !models.every(m => m === 'grok-4.3') ||
      typeof cached !== 'number' || typeof usage?.prompt_tokens !== 'number' ||
      typeof usage?.completion_tokens !== 'number') return null;
  if (usage.completion_tokens_details?.reasoning_tokens > 0 && typeof usage.total_tokens !== 'number') return null;
  const output = typeof usage.total_tokens === 'number'
    ? Math.max(usage.completion_tokens, usage.total_tokens - usage.prompt_tokens)
    : usage.completion_tokens;
  const multiplier = usage.prompt_tokens >= 200000 ? 2 : 1;
  return multiplier * ((usage.prompt_tokens - cached) * 1.25 + cached * .20 + output * 2.50) / 1e6;
}
